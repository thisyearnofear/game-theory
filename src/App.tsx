import { Button, Icon, Layout } from "@stellar/design-system";
import ConnectAccount from "./components/ConnectAccount.tsx";
import { Routes, Route, Outlet, NavLink, useNavigate } from "react-router-dom";
import Home from "./pages/Home";
import Debugger from "./pages/Debugger.tsx";
import { ZKGamePage } from "./pages/ZKGamePage.tsx";

const AppLayout: React.FC = () => {
  const navigate = useNavigate();

  return (
    <main>
      <Layout.Header
        projectId="Game Theory on Stellar"
        projectTitle="Game Theory on Stellar"
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
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/play" element={<ZKGamePage />} />
        <Route path="/play/:gameId" element={<ZKGamePage />} />
        <Route path="/debug" element={<Debugger />} />
        <Route path="/debug/:contractName" element={<Debugger />} />
      </Route>
    </Routes>
  );
}

export default App;
