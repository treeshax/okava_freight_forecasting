import React, { useState, useEffect } from "react";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import ImporterPortal from "./components/ImporterPortal";
import AnalyticsPortal from "./components/AnalyticsPortal";
import PortIntelligencePortal from "./components/PortIntelligencePortal";
import AgentCopilot from "./components/AgentCopilot";
import { DEMO_SCENARIOS } from "./data/mockData";

export default function App() {
  const [activePortal, setActivePortal] = useState("importer");
  const [theme, setTheme] = useState("dark");
  const [scenario, setScenario] = useState(null);

  useEffect(() => {
    const mainEl = document.querySelector(".app-main");
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [activePortal]);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle(
        "light-theme",
        next === "light",
      );
      return next;
    });
  };

  const renderPortal = () => {
    switch (activePortal) {
      case "importer":
        return <ImporterPortal />;
      case "analytics":
        return <AnalyticsPortal />;
      case "port":
        return <PortIntelligencePortal setActivePortal={setActivePortal} setScenario={setScenario} />;
      default:
        return <ImporterPortal />;
    }
  };

  return (
    <div
      className="app-bg"
      style={{ display: "flex", flexDirection: "column", height: "100vh" }}
    >
      <Header
        theme={theme}
        toggleTheme={toggleTheme}
        scenario={scenario}
        setScenario={setScenario}
        setActivePortal={setActivePortal}
      />
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar
          activePortal={activePortal}
          setActivePortal={setActivePortal}
        />
        <main
          className="app-main"
          style={{
            flex: 1,
            overflowY: "auto",
            background: "var(--bg-primary)",
          }}
        >
          {activePortal === "importer" ? (
            <ImporterPortal
              key={scenario?.label || "default"}
              scenario={scenario}
            />
          ) : (
            renderPortal()
          )}
        </main>
      </div>
      <AgentCopilot />
    </div>
  );
}
