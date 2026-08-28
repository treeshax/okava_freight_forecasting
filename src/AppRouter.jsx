import { Suspense, lazy, Component } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import HomePage from "./home/HomePage.jsx";
import ArchitecturePage from "./home/ArchitecturePage.jsx";

/**
 * Top-level router. Additive layer only:
 *   /              → Charter-IQ marketing homepage
 *   /architecture  → engineering pipeline detail (off the landing flow)
 *   /dashboard     → existing dashboard (src/App.jsx), rendered untouched
 *
 * The dashboard is code-split. If its chunk ever fails to load (stale cache
 * after a redeploy, flaky network), we fall back to a full-page navigation to
 * /dashboard — vercel.json rewrites that to index.html and the router mounts
 * the dashboard on a fresh load. The dashboard component is never modified.
 */
const Dashboard = lazy(() => import("./App.jsx"));

class DashboardBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    // chunk failed to load — recover with a fresh full-page load of the route
    if (typeof window !== "undefined") window.location.assign("/dashboard");
  }
  render() {
    if (this.state.failed) return <div style={{ height: "100vh" }} />;
    return this.props.children;
  }
}

function DashboardRoute() {
  return (
    <DashboardBoundary>
      <Suspense fallback={<div style={{ height: "100vh" }} />}>
        <Dashboard />
      </Suspense>
    </DashboardBoundary>
  );
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/architecture" element={<ArchitecturePage />} />
        <Route path="/dashboard" element={<DashboardRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
