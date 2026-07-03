import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import AppShell from "./components/AppShell.tsx";
import Home from "./pages/Home";
import { MascotProvider } from "./components/MascotContext";
import { ReactiveMascot } from "./components/ReactiveMascot";

// Route-based code splitting:
// - Home (landing hub) loads immediately — no ZK WASM needed
// - LearnJourney (slide deck) loads lazily — GSAP + slide content
// - TutorialSandbox (vs AI) loads lazily — strategy engine + AI tutor
// - TournamentPage loads lazily — tournament simulation engine
// - ZKGamePage (multiplayer) loads lazily — pulls in bb.js/noir_js only when
//   the user navigates to /play, keeping the initial bundle ~200KB
// - Debugger loads lazily — rarely used, keeps it out of the main bundle
const LearnJourney = lazy(() => import("./pages/LearnJourney.tsx"));
const TutorialSandbox = lazy(() =>
  import("./pages/TutorialSandbox.tsx").then((m) => ({
    default: m.TutorialSandbox,
  })),
);
const TournamentPage = lazy(() => import("./pages/TournamentPage.tsx"));
const ZKGamePage = lazy(() =>
  import("./pages/ZKGamePage.tsx").then((m) => ({ default: m.ZKGamePage })),
);
const Debugger = lazy(() => import("./pages/Debugger.tsx"));

function App() {
  return (
    <MascotProvider>
      <Suspense
        fallback={
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100vh",
              fontFamily: "Inter, sans-serif",
              color: "rgba(255,255,255,0.6)",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div
                style={{ fontSize: "2rem", marginBottom: "8px" }}
                className="tf-sway"
              >
                🪂
              </div>
              <div>Loading…</div>
            </div>
          </div>
        }
      >
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<Home />} />
            <Route path="/learn" element={<LearnJourney />} />
            <Route path="/learn/play" element={<TutorialSandbox />} />
            <Route path="/tournament" element={<TournamentPage />} />
            <Route path="/play" element={<ZKGamePage />} />
            <Route path="/play/:gameId" element={<ZKGamePage />} />
            <Route path="/debug" element={<Debugger />} />
            <Route path="/debug/:contractName" element={<Debugger />} />
          </Route>
        </Routes>
        <ReactiveMascot />
      </Suspense>
    </MascotProvider>
  );
}

export default App;
