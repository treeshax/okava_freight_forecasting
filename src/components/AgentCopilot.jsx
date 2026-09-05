import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Send,
  X,
  Bot,
  RotateCcw,
  Minimize2,
  Maximize2,
  Wrench,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
  Ship,
  TrendingUp,
} from "lucide-react";

const API_URL = "http://localhost:8000/api/agent/chat";

const DEFAULT_PROMPTS = [
  { label: "Rank Vessels", query: "Rank eligible vessel classes for 75,000 MT coal from Newcastle to Paradip." },
  { label: "Haldia Draft", query: "Can a Capesize or Panamax enter Haldia port during monsoon?" },
  { label: "14-Day Rate", query: "What is the 14-day freight rate forecast for Richards Bay to Vizag?" },
  { label: "Spot vs CoA", query: "Recommend a Spot vs CoA hedging split for Newcastle to Paradip." },
];

/** Simple markdown formatter for agent replies */
function FormattedText({ text }) {
  if (!text) return null;

  // Split into lines
  const lines = text.split("\n");
  const elements = [];
  let inTable = false;
  let tableRows = [];

  const renderFormattedLine = (str, key) => {
    // Bold: **text**
    const parts = str.split(/(\*\*.*?\*\*|`.*?`)/g);
    return (
      <span key={key}>
        {parts.map((part, i) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return (
              <strong key={i} style={{ color: "var(--text-primary)", fontWeight: 700 }}>
                {part.slice(2, -2)}
              </strong>
            );
          }
          if (part.startsWith("`") && part.endsWith("`")) {
            return (
              <code
                key={i}
                style={{
                  background: "rgba(148, 163, 184, 0.15)",
                  padding: "1px 5px",
                  borderRadius: 4,
                  fontSize: "0.8em",
                  color: "#38bdf8",
                }}
              >
                {part.slice(1, -1)}
              </code>
            );
          }
          return part;
        })}
      </span>
    );
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Table row detection: starts and ends with |
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      if (trimmed.includes("---")) return; // skip markdown divider
      inTable = true;
      const cells = trimmed
        .split("|")
        .slice(1, -1)
        .map((c) => c.trim());
      tableRows.push(cells);
      return;
    } else if (inTable) {
      // Flush table
      elements.push(
        <div
          key={`table-${idx}`}
          style={{
            overflowX: "auto",
            margin: "8px 0",
            borderRadius: 6,
            border: "1px solid var(--border-color)",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.75rem",
            }}
          >
            <tbody>
              {tableRows.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  style={{
                    background:
                      rIdx === 0
                        ? "rgba(148, 163, 184, 0.12)"
                        : rIdx % 2 === 1
                        ? "rgba(255,255,255,0.02)"
                        : "transparent",
                    borderBottom: "1px solid var(--border-color)",
                  }}
                >
                  {row.map((cell, cIdx) => (
                    <td
                      key={cIdx}
                      style={{
                        padding: "6px 8px",
                        fontWeight: rIdx === 0 ? 700 : 400,
                        color: rIdx === 0 ? "var(--text-primary)" : "var(--text-secondary)",
                      }}
                    >
                      {renderFormattedLine(cell, cIdx)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      inTable = false;
      tableRows = [];
    }

    if (trimmed.startsWith("### ")) {
      elements.push(
        <h4
          key={idx}
          style={{
            margin: "12px 0 6px 0",
            fontSize: "0.92rem",
            fontWeight: 700,
            color: "#38bdf8",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {renderFormattedLine(trimmed.replace("### ", ""), idx)}
        </h4>
      );
    } else if (trimmed.startsWith("- ")) {
      elements.push(
        <div
          key={idx}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 6,
            margin: "3px 0",
            paddingLeft: 4,
          }}
        >
          <span style={{ color: "#38bdf8", marginTop: 2 }}>•</span>
          <div>{renderFormattedLine(trimmed.replace("- ", ""), idx)}</div>
        </div>
      );
    } else if (trimmed.length > 0) {
      elements.push(
        <p key={idx} style={{ margin: "5px 0", lineHeight: 1.5 }}>
          {renderFormattedLine(trimmed, idx)}
        </p>
      );
    }
  });

  return <div>{elements}</div>;
}

export default function AgentCopilot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "agent",
      text: "👋 Welcome! I am your **Charter-IQ Autonomous Copilot**.\n\nI can assist you with:\n- **Vessel Rankings & Cost Matcher** (effective landed voyage costs)\n- **Multi-Horizon Freight Forecasts** (7d, 14d, 30d LightGBM + Prophet)\n- **Port Physical & Seasonal Constraints** (Haldia monsoon draft limits, LOA, beam)\n- **Route Risk Alerts & CoA Hedging** (volatility z-scores, Spot vs CoA splits)\n\nSelect a prompt below or ask any chartering question!",
      toolsCalled: [],
      timestamp: new Date(),
    },
  ]);
  const [inputQuery, setInputQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (overrideText) => {
    const textToSend = overrideText || inputQuery;
    if (!textToSend.trim() || isLoading) return;

    const userMessage = {
      role: "user",
      text: textToSend.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputQuery("");
    setIsLoading(true);

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage.text }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          text: data.reply || "No response received from the agent engine.",
          toolsCalled: data.tools_called || [],
          modelUsed: data.model_used || "charter-iq-v2",
          timestamp: new Date(),
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          text: `⚠️ **Connection Notice**: Unable to reach backend gateway at \`${API_URL}\`.\n\nPlease ensure \`python api/main.py\` is running on port 8000.`,
          toolsCalled: [],
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: "agent",
        text: "Chat cleared. Ready for your next maritime procurement inquiry!",
        toolsCalled: [],
        timestamp: new Date(),
      },
    ]);
  };

  return (
    <>
      {/* Floating Launcher Trigger */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 18px",
            borderRadius: 30,
            background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
            color: "#ffffff",
            border: "1px solid rgba(56, 189, 248, 0.4)",
            boxShadow: "0 8px 24px rgba(2, 132, 199, 0.4), 0 2px 6px rgba(0,0,0,0.3)",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "0.85rem",
            transition: "all 0.25s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-3px) scale(1.03)";
            e.currentTarget.style.boxShadow = "0 12px 30px rgba(2, 132, 199, 0.55)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0) scale(1)";
            e.currentTarget.style.boxShadow = "0 8px 24px rgba(2, 132, 199, 0.4)";
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.2)",
            }}
          >
            <Sparkles size={16} color="#ffffff" />
          </div>
          <span>AI Chartering Copilot</span>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#10b981",
              boxShadow: "0 0 8px #10b981",
            }}
          />
        </button>
      )}

      {/* Floating Chat Drawer Window */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 9999,
            width: isExpanded ? "min(680px, 92vw)" : "min(420px, 92vw)",
            height: isExpanded ? "min(720px, 86vh)" : "min(560px, 80vh)",
            background: "var(--bg-card)",
            border: "1px solid var(--border-bright)",
            borderRadius: 18,
            boxShadow: "0 20px 45px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255,255,255,0.06)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            transition: "width 0.25s ease, height 0.25s ease",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "14px 18px",
              background: "var(--bg-secondary)",
              borderBottom: "1px solid var(--border-color)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #0284c7, #0369a1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Bot size={20} color="#ffffff" />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--text-primary)" }}>
                  Charter-IQ Copilot
                </div>
                <div style={{ fontSize: "0.68rem", color: "#10b981", display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }} />
                  Multi-Tool Decision Reasoner Active
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                onClick={clearChat}
                title="Clear Chat"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  padding: 6,
                  borderRadius: 6,
                }}
              >
                <RotateCcw size={15} />
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? "Collapse" : "Expand"}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  padding: 6,
                  borderRadius: 6,
                }}
              >
                {isExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close Window"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  padding: 6,
                  borderRadius: 6,
                }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages Scroll View */}
          <div
            style={{
              flex: 1,
              padding: "16px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              background: "var(--bg-primary)",
            }}
          >
            {messages.map((msg, i) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: isUser ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    style={{
                      maxWidth: "88%",
                      padding: "10px 14px",
                      borderRadius: isUser ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                      background: isUser ? "#0284c7" : "var(--bg-card)",
                      color: isUser ? "#ffffff" : "var(--text-primary)",
                      border: isUser ? "none" : "1px solid var(--border-color)",
                      fontSize: "0.82rem",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
                    }}
                  >
                    {isUser ? (
                      <div style={{ whiteSpace: "pre-wrap" }}>{msg.text}</div>
                    ) : (
                      <>
                        {/* Tool Execution Badges */}
                        {msg.toolsCalled && msg.toolsCalled.length > 0 && (
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 6,
                              marginBottom: 8,
                              paddingBottom: 6,
                              borderBottom: "1px solid var(--border-color)",
                            }}
                          >
                            {msg.toolsCalled.map((tool, tIdx) => (
                              <span
                                key={tIdx}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                  fontSize: "0.68rem",
                                  fontWeight: 600,
                                  color: "#38bdf8",
                                  background: "rgba(56, 189, 248, 0.12)",
                                  padding: "2px 7px",
                                  borderRadius: 6,
                                }}
                              >
                                <Wrench size={10} />
                                {tool.replace("tool_", "")}
                              </span>
                            ))}
                          </div>
                        )}
                        <FormattedText text={msg.text} />
                      </>
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: "0.62rem",
                      color: "var(--text-muted)",
                      marginTop: 3,
                      padding: "0 4px",
                    }}
                  >
                    {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              );
            })}

            {isLoading && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px" }}>
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: "rgba(56, 189, 248, 0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Sparkles size={12} color="#38bdf8" />
                </div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  Copilot evaluating port rules & models...
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Chips */}
          <div
            style={{
              padding: "8px 14px",
              background: "var(--bg-secondary)",
              borderTop: "1px solid var(--border-color)",
              display: "flex",
              gap: 6,
              overflowX: "auto",
              whiteSpace: "nowrap",
            }}
          >
            {DEFAULT_PROMPTS.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(p.query)}
                disabled={isLoading}
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-color)",
                  borderRadius: 14,
                  padding: "4px 10px",
                  fontSize: "0.7rem",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#38bdf8";
                  e.currentTarget.style.color = "#38bdf8";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-color)";
                  e.currentTarget.style.color = "var(--text-secondary)";
                }}
              >
                <span>{p.label}</span>
                <ChevronRight size={11} />
              </button>
            ))}
          </div>

          {/* Input Area */}
          <div
            style={{
              padding: "12px 14px",
              background: "var(--bg-card)",
              borderTop: "1px solid var(--border-color)",
              display: "flex",
              gap: 8,
              alignItems: "center",
            }}
          >
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask about rates, vessel viability, or draft limits..."
              disabled={isLoading}
              style={{
                flex: 1,
                background: "var(--bg-input)",
                border: "1px solid var(--border-color)",
                borderRadius: 10,
                padding: "9px 12px",
                color: "var(--text-primary)",
                fontSize: "0.82rem",
                outline: "none",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#38bdf8")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-color)")}
            />
            <button
              onClick={() => handleSend()}
              disabled={isLoading || !inputQuery.trim()}
              style={{
                background: inputQuery.trim() && !isLoading ? "#0284c7" : "var(--bg-secondary)",
                color: inputQuery.trim() && !isLoading ? "#ffffff" : "var(--text-muted)",
                border: "none",
                borderRadius: 10,
                width: 36,
                height: 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: inputQuery.trim() && !isLoading ? "pointer" : "default",
                transition: "background 0.2s ease",
              }}
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
