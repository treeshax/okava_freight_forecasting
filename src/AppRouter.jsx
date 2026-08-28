import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import HomePage from "./home/HomePage.jsx";

/**
 * Top-level router. Additive layer only:
 *   /            → new Charter-IQ marketing homepage
 *   /dashboard   → existing dashboard (src/App.jsx), imported and rendered untouched
 *
 * The dashboard is lazy-loaded so the landing page doesn't ship its bundle,
 * and the dashboard component itself is not modified in any way.
 */
const Dashboard = lazy(() => import("./App.jsx"));

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/dashboard"
          element={
            <Suspense fallback={<div style={{ height: "100vh" }} />}>
              <Dashboard />
            </Suspense>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
