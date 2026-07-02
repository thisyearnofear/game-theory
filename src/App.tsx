import { Button, Icon, Layout } from "@stellar/design-system";
import ConnectAccount from "./components/ConnectAccount.tsx";
import { Routes, Route, Outlet, NavLink, useNavigate } from "react-router-dom";
import Home from "./pages/Home";
import { lazy, Suspense } from "react";

// Route-based code splitting:
// - Home (tutorial/tournament) loads immediately — no ZK WASM needed
// - ZKGamePage (multiplayer) loads lazily — pulls in bb.js/noir_js only when
//   the user navigates to /play, keeping the initial bundle ~200KB
// - Debugger loads lazily — rarely used, keeps it out of the main bundle
const ZKGamePage = lazy(() =>
  import("./pages/ZKGamePage.tsx").then((m) => ({ default: m.ZKGamePage })),
);
const Debugger = lazy(() => import("./pages/Debugger.tsx"));

const AppLayout: React.FC = () => {
  const navigate = useNavigate();

  return (
    <main>
      <Layout.Header
        projectId="Trustfall"
        projectTitle="Trustfall"
        contentRight={
          <>
            <nav style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <NavLink
                to="/play"
                style={{
                  textDecoration: "none",
                }}
              >
                {({ isActive }) => (
                  <Button
                    variant={isActive ? "primary" : "tertiary"}
                    size="md"
                    onClick={() => void navigate("/play")}
                    disabled={isActive}
                  >
                    🎮 ZK Play
                  </Button>
                )}
              </NavLink>
              <NavLink
                to="/debug"
                style={{
                  textDecoration: "none",
                }}
              >
                {({ isActive }) => (
                  <Button
                    variant="tertiary"
                    size="md"
                    onClick={() => void navigate("/debug")}
                    disabled={isActive}
                  >
                    <Icon.Code02 size="md" />
                    Debugger
                  </Button>
                )}
              </NavLink>
            </nav>
            <ConnectAccount />
          </>
        }
      />
      <Outlet />
    </main>
  );
};

function App() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            fontFamily: "FuturaHandwritten, sans-serif",
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
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/play" element={<ZKGamePage />} />
          <Route path="/play/:gameId" element={<ZKGamePage />} />
          <Route path="/debug" element={<Debugger />} />
          <Route path="/debug/:contractName" element={<Debugger />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default App;
