/**
 * AppShell — Unified application shell
 *
 * Persistent top navigation with three sections (Learn / Tournament / Play),
 * wallet connection, audio controls, custom cursor, and topographic background.
 * Replaces the Stellar Layout.Header with a cohesive design-token-driven shell
 * that shares the glassmorphism visual language across all surfaces.
 */

import React, { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import ConnectAccount from "./ConnectAccount.tsx";
import { TopographicBackground } from "./visual/TopographicBackground";
import { CustomCursor } from "./ui/CustomCursor";
import AudioManager from "./AudioManager";
import { TrustFallCharacter } from "./TrustFallCharacter";

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/learn", label: "Learn", icon: "🤝" },
  { to: "/tournament", label: "Tournament", icon: "🏆" },
  { to: "/play", label: "Play", icon: "🔒" },
];

const AppShell: React.FC = () => {
  const navigate = useNavigate();
  const [audioManager] = useState(() => AudioManager.getInstance());
  const [audioOpen, setAudioOpen] = useState(false);

  return (
    <>
      <CustomCursor />
      <TopographicBackground />

      {/* Top navigation */}
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: "64px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          background: "rgba(10, 14, 26, 0.7)",
          backdropFilter: "blur(20px) saturate(160%)",
          WebkitBackdropFilter: "blur(20px) saturate(160%)",
          borderBottom: "1px solid var(--border-glass)",
          zIndex: 100,
        }}
      >
        {/* Logo / brand */}
        <NavLink
          to="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            textDecoration: "none",
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-xl)",
            color: "var(--text-primary)",
            letterSpacing: "-0.02em",
          }}
        >
          <span
            style={{ filter: "drop-shadow(0 0 8px rgba(102, 126, 234, 0.3))" }}
          >
            <TrustFallCharacter state="standing" color="you" size="sm" />
          </span>
          <span>Trustfall</span>
        </NavLink>

        {/* Center nav */}
        <nav
          style={{
            display: "flex",
            gap: "4px",
            alignItems: "center",
          }}
        >
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              style={{ textDecoration: "none" }}
            >
              {({ isActive }) => (
                <button
                  type="button"
                  onClick={() => void navigate(item.to)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 16px",
                    borderRadius: "var(--radius-sm)",
                    border: "none",
                    background: isActive
                      ? "rgba(102, 126, 234, 0.2)"
                      : "transparent",
                    color: isActive
                      ? "var(--text-primary)"
                      : "var(--text-secondary)",
                    fontFamily: "var(--font-body)",
                    fontSize: "var(--text-sm)",
                    fontWeight: isActive ? 600 : 400,
                    cursor: "pointer",
                    transition: "all var(--duration-fast) var(--ease-out)",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background =
                        "rgba(255, 255, 255, 0.06)";
                      e.currentTarget.style.color = "var(--text-primary)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "var(--text-secondary)";
                    }
                  }}
                >
                  <span style={{ fontSize: "1rem" }}>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Right: audio + wallet */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          {/* Audio toggle */}
          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setAudioOpen(!audioOpen)}
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                border: "1px solid var(--border-glass)",
                background: "var(--bg-glass-light)",
                color: "var(--text-secondary)",
                cursor: "pointer",
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all var(--duration-fast) var(--ease-out)",
              }}
              title="Audio settings"
            >
              {audioManager.isMusicEnabled ? "🎵" : "🔇"}
            </button>
            {audioOpen && (
              <div
                className="glass-panel"
                style={{
                  position: "absolute",
                  top: "44px",
                  right: 0,
                  padding: "12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  minWidth: "160px",
                  zIndex: 200,
                }}
              >
                <button
                  type="button"
                  onClick={() => audioManager.toggleMusic()}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "6px 10px",
                    borderRadius: "var(--radius-sm)",
                    border: "none",
                    background: "transparent",
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-body)",
                    fontSize: "var(--text-sm)",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  {audioManager.isMusicEnabled ? "🎵" : "🔇"} Music
                </button>
                <button
                  type="button"
                  onClick={() => audioManager.toggleSFX()}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "6px 10px",
                    borderRadius: "var(--radius-sm)",
                    border: "none",
                    background: "transparent",
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-body)",
                    fontSize: "var(--text-sm)",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  {audioManager.isSFXEnabled ? "🔊" : "🔈"} Sound Effects
                </button>
              </div>
            )}
          </div>

          <ConnectAccount />
        </div>
      </header>

      {/* Page content */}
      <main
        style={{
          paddingTop: "64px",
          minHeight: "100vh",
          position: "relative",
          zIndex: 1,
        }}
      >
        <Outlet />
      </main>
    </>
  );
};

export default AppShell;
