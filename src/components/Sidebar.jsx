import { Package, BarChart2, Anchor, Globe } from "lucide-react";

const navItems = [
  {
    id: "importer",
    icon: Package,
    label: "Procurement & Feasibility",
    sub: "Operational workspace",
  },
  {
    id: "analytics",
    icon: BarChart2,
    label: "Analytics & Forecasting",
    sub: "Explainable rates",
  },
  {
    id: "port",
    icon: Anchor,
    label: "Risk Radar & Ports",
    sub: "Operational intelligence",
  },
];

export default function Sidebar({ activePortal, setActivePortal }) {
  return (
    <aside
      className="nav-sidebar"
      style={{
        display: "flex",
        flexDirection: "column",
        padding: "1rem 0.5rem",
        gap: "0.25rem",
        overflowX: "hidden",
        minHeight: 0,
      }}
    >
      <div style={{ marginBottom: "0.5rem" }}>
        <div
          className="sidebar-label"
          style={{
            fontSize: "0.55rem",
            fontWeight: 700,
            letterSpacing: "0.15em",
            color: "var(--text-muted)",
            textTransform: "uppercase",
            padding: "0 0.75rem",
            marginBottom: "0.5rem",
          }}
        >
          PORTALS
        </div>
      </div>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activePortal === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActivePortal(item.id)}
            className={`nav-item ${isActive ? "active" : ""}`}
            title={item.label}
            data-tooltip={item.label}
            style={{
              borderLeft: isActive
                ? "3px solid var(--accent-primary)"
                : "3px solid transparent",
              background: isActive ? "rgba(148,163,184,0.12)" : "transparent",
              color: isActive
                ? "var(--accent-primary)"
                : "var(--text-secondary)",
              border: "none",
              textAlign: "left",
              cursor: "pointer",
              width: "100%",
            }}
          >
            <Icon
              className="nav-icon"
              size={26}
              strokeWidth={1.8}
              style={{ flexShrink: 0 }}
            />
            <div className="nav-item-copy" style={{ overflow: "hidden" }}>
              <div
                style={{
                  fontSize: "0.825rem",
                  fontWeight: 600,
                  lineHeight: 1.2,
                }}
              >
                {item.label}
              </div>
              <div
                style={{
                  fontSize: "0.65rem",
                  color: "var(--text-muted)",
                  marginTop: 1,
                }}
              >
                {item.sub}
              </div>
            </div>
          </button>
        );
      })}
      <div style={{ marginTop: "auto" }}>
        <div
          style={{
            padding: "0.75rem",
            borderRadius: "10px",
            background: "rgba(148,163,184,0.07)",
            border: "1px solid var(--border-color)",
          }}
        >
          <Globe
            size={22}
            color="var(--accent-primary)"
            style={{ marginBottom: 4 }}
          />
          <div
            className="sidebar-status-copy"
            style={{
              fontSize: "0.65rem",
              color: "var(--text-muted)",
              lineHeight: 1.4,
            }}
          >
            India East Coast
            <br />
            <span style={{ color: "var(--accent-green)", fontWeight: 600 }}>
              6 Ports Active
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
