"""
charter_agent.py
Charter-IQ Autonomous AI Agent Engine.
Coordinates multi-tool decision reasoning for bulk maritime procurement.
Supports OpenAI / Gemini function-calling API with an intelligent local intent router fallback.
"""

import os
import re
import json
import logging
import datetime
from typing import Dict, Any, List, Optional

from agent.tools import TOOL_DEFINITIONS, TOOL_MAP

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """
You are Charter-IQ Copilot, an elite maritime dry-bulk freight strategist and logistics advisor for SAIL (Steel Authority of India Ltd).
Your job is to advise procurement directors and chartering superintendents on vessel class selection, voyage rate forecasts,
seasonal monsoon draft restrictions, port turnaround tariffs, idle congestion risks, and Spot vs. Contract of Affreightment (CoA) hedging strategies.

Core Knowledge & Rules:
1. Ports: Origin coal/ore hubs include Newcastle (NCWL), Richards Bay (RICH), Samarinda (SAMA), Hampton Roads (HAMP), and Vostochny (VOST).
   Discharge steel-belt ports include Paradip (PRDP), Visakhapatnam (VIZG), Haldia (HALD), Dhamra (DHMR), Gangavaram (GNGV), and Sagar Sandheads (SAGA).
2. Physical Constraints:
   - Haldia (HALD) is a shallow riverine port with severe seasonal monsoon silting (max draft 8.0m in monsoon, 8.8m in dry season). Capesize (18.2m) and Panamax (14.5m) CANNOT discharge at Haldia berth without lightering at Sagar Sandheads (SAGA).
   - Vostochny (VOST) routes carry geopolitical compliance flags and war risk insurance surcharges.
3. Total Effective Cost: Never evaluate freight rate in isolation. Always consider:
   Effective Cost = Base Freight + Port Turnaround Tariffs + Congestion Idle Delays + Geopolitical/Sanctions Risk Premium - Scale Adjustments.
4. Hedging: If a route has RED volatility or cyclone alerts, advise locking in 60-75% volume via multi-voyage CoA ladders rather than purely gambling on soft spot curves.
5. Always cite specific numerical values ($/MT, total voyage dollars, and confidence intervals) from tool outputs.
"""

# Port code synonyms map
PORT_SYNONYMS = {
    "newcastle": "NCWL", "ncwl": "NCWL",
    "richards bay": "RICH", "rich": "RICH", "rbct": "RICH",
    "samarinda": "SAMA", "sama": "SAMA", "indonesia": "SAMA",
    "hampton": "HAMP", "hamp": "HAMP", "norfolk": "HAMP",
    "vostochny": "VOST", "vost": "VOST", "russia": "VOST",
    "hay point": "HYPT", "hypt": "HYPT",
    "beira": "MBOZ", "mboz": "MBOZ", "mozambique": "MBOZ",
    "port hedland": "PORT", "port": "PORT",
    "paradip": "PRDP", "prdp": "PRDP",
    "visakhapatnam": "VIZG", "vizag": "VIZG", "vizg": "VIZG",
    "haldia": "HALD", "hald": "HALD",
    "dhamra": "DHMR", "dhmr": "DHMR",
    "gangavaram": "GNGV", "gngv": "GNGV",
    "gopalpur": "GPPR", "gppr": "GPPR",
    "sagar": "SAGA", "saga": "SAGA", "sandheads": "SAGA"
}

PORT_NAMES = {
    "HALD": "Haldia", "PRDP": "Paradip", "VIZG": "Visakhapatnam",
    "NCWL": "Newcastle", "RICH": "Richards Bay", "SAMA": "Samarinda",
    "DHMR": "Dhamra", "GNGV": "Gangavaram", "SAGA": "Sagar Sandheads",
    "VOST": "Vostochny", "HAMP": "Hampton Roads", "PORT": "Port Hedland"
}


def extract_route_and_vessel(user_prompt: str):
    """
    Extracts origin, destination, vessel class, cargo volume, and forecast horizon from query text.
    """
    text = user_prompt.lower()
    origin = "NCWL"
    dest = "PRDP"
    for word, code in PORT_SYNONYMS.items():
        if word in text:
            if code in ["NCWL", "RICH", "SAMA", "HAMP", "VOST", "HYPT", "MBOZ", "PORT"]:
                origin = code
            elif code in ["PRDP", "VIZG", "HALD", "DHMR", "GNGV", "GPPR", "SAGA"]:
                dest = code

    vessel = "panamax"
    for v in ["capesize", "panamax", "supramax", "handysize"]:
        if v in text:
            vessel = v
            break

    volume = 75000.0
    num_match = re.search(r"(\d[\d,]*)\s*(?:mt|metric tons?|tonnes?)", text)
    if num_match:
        volume = float(num_match.group(1).replace(",", ""))
    else:
        k_match = re.search(r"(\d+)\s*k\b", text)
        if k_match:
            volume = float(k_match.group(1)) * 1000.0

    horizon = 14
    h_match = re.search(r"(\d+)\s*[- ]*(?:day|d)\b", text)
    if h_match:
        horizon = int(h_match.group(1))

    return origin, dest, vessel, volume, horizon


class CharterIQAgent:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY") or os.getenv("OPENAI_API_KEY") or os.getenv("GROQ_API_KEY")
        self.client = None
        self.model_name = "local-expert-router"

        if self.api_key:
            try:
                from openai import OpenAI
                if os.getenv("GEMINI_API_KEY"):
                    self.client = OpenAI(
                        api_key=os.getenv("GEMINI_API_KEY"),
                        base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
                    )
                    self.model_name = "gemini-2.5-flash"
                elif os.getenv("GROQ_API_KEY"):
                    self.client = OpenAI(
                        api_key=os.getenv("GROQ_API_KEY"),
                        base_url="https://api.groq.com/openai/v1"
                    )
                    self.model_name = "llama-3.3-70b-versatile"
                else:
                    self.client = OpenAI(api_key=self.api_key)
                    self.model_name = "gpt-4o-mini"
                logger.info(f"Initialized LLM client using model: {self.model_name}")
            except Exception as e:
                logger.warning(f"Failed to initialize remote LLM client: {e}. Defaulting to local intent router.")
                self.client = None

    def _execute_tool(self, tool_name: str, arguments: dict) -> Any:
        func = TOOL_MAP.get(tool_name)
        if not func:
            return {"error": f"Unknown tool {tool_name}"}
        try:
            return func(**arguments)
        except Exception as e:
            logger.error(f"Execution error in {tool_name}: {e}")
            return {"error": str(e)}

    def _local_intent_router(self, user_prompt: str) -> Dict[str, Any]:
        """
        High-precision domain intent router and response synthesizer.
        Invoked when no external LLM API key is present, guaranteeing 100% offline functionality.
        """
        text = user_prompt.lower()
        tools_called = []

        origin, dest, vessel, volume, horizon = extract_route_and_vessel(user_prompt)

        # Route intent
        # A. Port constraints check
        if any(k in text for k in ["draft", "can enter", "enter", "allowed", "restriction", "sanction", "monsoon", "silting", "limit"]):
            tools_called.append("tool_check_port_constraints")
            pc_res = self._execute_tool("tool_check_port_constraints", {
                "origin": origin,
                "destination": dest,
                "vessel_class": vessel,
                "laycan_start": datetime.date.today().isoformat()
            })
            
            status = "✅ **PERMITTED**" if pc_res.get("is_permitted") else "❌ **REJECTED BY RULES**"
            reasons = "\n".join([f"- {r}" for r in pc_res.get("audit_reasons", [])])
            
            dest_name = PORT_NAMES.get(dest, dest)
            origin_name = PORT_NAMES.get(origin, origin)
            
            reply = f"""### Port Constraints Analysis: {pc_res.get('vessel_class')} at {dest_name} ({dest})

**Operational Status**: {status}
**Origin Port**: `{origin_name} ({origin})` | **Discharge Port**: `{dest_name} ({dest})`

**Audit Findings**:
{reasons}

**Strategic Advisory**:
{"The vessel dimensions fit the port limits for this laycan. Proceed with draft survey upon arrival." if pc_res.get("is_permitted") else f"The {pc_res.get('vessel_class')} exceeds draft or LOA limits for {dest_name}. Recommend lightering at Sagar Sandheads (SAGA) or chartering a Supramax/Handysize class to avoid stranding and high demurrage."}
"""
            return {"reply": reply, "tools_called": tools_called, "model_used": self.model_name}

        # B. Vessel Ranking / Cost Matcher
        elif any(k in text for k in ["rank", "cost", "cheapest", "best vessel", "which vessel", "recommend vessel", "compare"]):
            tools_called.append("tool_rank_vessels_by_cost")
            tools_called.append("tool_get_route_risk_alerts")
            
            rank_res = self._execute_tool("tool_rank_vessels_by_cost", {
                "origin": origin,
                "destination": dest,
                "volume": volume,
                "laycan_start": datetime.date.today().isoformat()
            })
            risk_res = self._execute_tool("tool_get_route_risk_alerts", {
                "origin": origin,
                "destination": dest,
                "vessel_class": vessel
            })

            rankings = rank_res.get("eligible_vessels_ranked", [])
            table_rows = []
            for idx, r in enumerate(rankings):
                badge = "🥇 Best Match" if idx == 0 else f"#{idx+1}"
                table_rows.append(
                    f"| {badge} | **{r['vessel_class']}** | ${r['effective_cost_per_tonne']:.2f}/MT | ${r['effective_cost']:,.2f} | ${r['cost_breakdown']['idle_delay']:,.2f} |"
                )
            table_str = "\n".join(table_rows)

            best = rankings[0] if rankings else None
            best_name = best['vessel_class'] if best else 'Panamax'
            best_rate = f"${best['effective_cost_per_tonne']:.2f}/MT" if best else "N/A"

            reply = f"""### Vessel Procurement Recommendation: {origin} ➔ {dest}

For cargo volume of **{volume:,.0f} MT**, our matching engine filtered physical constraints and ranked eligible vessel classes by **total effective shipping cost**:

| Rank | Vessel Class | Effective Rate | Total Voyage Cost | Idle Delay Exposure |
| :--- | :--- | :--- | :--- | :--- |
{table_str}

**Risk Assessment**:
- Route Status: **{risk_res.get('status', 'GREEN')}**
- Port Queue: **{risk_res.get('congestion_score', 0)} vessels** waiting at anchorage.
- Rate Volatility: **Z = {risk_res.get('volatility_z', 0.0)}**

**Actionable Recommendation**:
Charter **{best_name}** at an effective landed rate of **{best_rate}**. It maximizes economies of scale while minimizing port turnaround penalties.
"""
            return {"reply": reply, "tools_called": tools_called, "model_used": self.model_name}

        # C. Hedging / Spot vs. CoA
        elif any(k in text for k in ["coa", "spot", "ladder", "hedge", "split", "portfolio", "annual"]):
            tools_called.append("tool_get_portfolio_laddering")
            hedge_res = self._execute_tool("tool_get_portfolio_laddering", {
                "origin": origin,
                "destination": dest,
                "annual_volume": 300000.0
            })
            split = hedge_res.get("recommended_split", {})
            metrics = hedge_res.get("hedging_metrics", {})

            reply = f"""### Portfolio Hedging & CoA Laddering: {origin} ➔ {dest}

**Annual Allocation Strategy**:
- **Fixed CoA Ladder**: **{split.get('coa_percentage', 60)}%** ({split.get('coa_volume_mt', 0):,.0f} MT)
- **Spot Market Fixtures**: **{split.get('spot_percentage', 40)}%** ({split.get('spot_volume_mt', 0):,.0f} MT)

**Market Rationale**:
{hedge_res.get('strategy_rationale', 'Distribute fixtures to hedge peak seasonal price surges.')}

**Financial Impact**:
- Projected Annual Savings: **${metrics.get('estimated_savings_usd', 0):,.2f}** (~{metrics.get('savings_percentage', 0)}% vs. peak spot fixtures)
- Risk Volatility Hedged: **{metrics.get('risk_hedged_percentage', 0)}%**
"""
            return {"reply": reply, "tools_called": tools_called, "model_used": self.model_name}

        # D. Default: Freight Forecast & SHAP Drivers
        else:
            tools_called.append("tool_get_freight_forecast")
            tools_called.append("tool_get_route_risk_alerts")

            fc = self._execute_tool("tool_get_freight_forecast", {
                "origin": origin,
                "destination": dest,
                "vessel_class": vessel,
                "horizon_days": 14
            })
            risk = self._execute_tool("tool_get_route_risk_alerts", {
                "origin": origin,
                "destination": dest,
                "vessel_class": vessel
            })

            drivers = fc.get("top_shap_features", [])
            drivers_list = "\n".join([f"- **{d['feature']}**: Impact {d['impact']:+.2f} $/MT" for d in drivers])

            reply = f"""### Freight Rate Forecast: {origin} ➔ {dest} ({vessel.capitalize()})

- **Point Forecast (14-Day Horizon)**: **${fc.get('point_forecast', 15.0):.2f}/MT**
- **Confidence Interval (90%)**: `[${fc.get('ci_lower', 13.5):.2f}, ${fc.get('ci_upper', 16.5):.2f}]`
- **Seasonal Baseline**: ${fc.get('prophet_point_forecast', 15.2):.2f}/MT
- **Model Version**: `{fc.get('model_version', 'v2.0.0-multi-horizon')}`

**Key SHAP Market Drivers**:
{drivers_list}

**Operational Risk Flag**: `{risk.get('status', 'GREEN')}` (Anchorage queue: {risk.get('congestion_score', 0)} vessels).

**Procurement Tip**:
With the current trend, entering the fixture window 7–10 days before laycan start will capture the soft spot trajectory.
"""
            return {"reply": reply, "tools_called": tools_called, "model_used": self.model_name}

    def chat(self, user_message: str, session_id: str = "default") -> Dict[str, Any]:
        """
        Main chat pipeline. Routes through remote LLM with function-calling if configured,
        or uses the built-in local domain router if running offline.
        """
        if not self.client:
            return self._local_intent_router(user_message)

        # Full LLM Tool-Calling Loop
        try:
            tools_called = []
            messages = [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message}
            ]

            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=messages,
                tools=TOOL_DEFINITIONS,
                tool_choice="auto",
                temperature=0.2
            )

            response_message = response.choices[0].message
            tool_calls = response_message.tool_calls

            if tool_calls:
                messages.append(response_message)
                for tool_call in tool_calls:
                    function_name = tool_call.function.name
                    function_args = json.loads(tool_call.function.arguments)
                    tools_called.append(function_name)

                    tool_output = self._execute_tool(function_name, function_args)
                    messages.append({
                        "tool_call_id": tool_call.id,
                        "role": "tool",
                        "name": function_name,
                        "content": json.dumps(tool_output)
                    })

                second_response = self.client.chat.completions.create(
                    model=self.model_name,
                    messages=messages,
                    temperature=0.2
                )
                final_reply = second_response.choices[0].message.content
                return {
                    "reply": final_reply,
                    "tools_called": tools_called,
                    "model_used": self.model_name
                }
            else:
                return {
                    "reply": response_message.content,
                    "tools_called": [],
                    "model_used": self.model_name
                }
        except Exception as e:
            logger.warning(f"Remote LLM completion failed: {e}. Falling back to local domain router.")
            res = self._local_intent_router(user_message)
            res["fallback_reason"] = str(e)
            return res
