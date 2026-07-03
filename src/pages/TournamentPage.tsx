/**
 * TournamentPage — Evolutionary tournament simulation
 *
 * Standalone page for the tournament mode, previously embedded as a tab
 * inside GameSlide. Now a first-class route at /tournament.
 */

import React from "react";
import { TournamentMode } from "../components/slides/TournamentMode";

const TournamentPage: React.FC = () => {
  return (
    <div
      style={{
        maxWidth: "900px",
        margin: "0 auto",
        padding: "40px 20px 80px",
      }}
    >
      <div style={{ marginBottom: "32px", textAlign: "center" }}>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-3xl)",
            marginBottom: "8px",
          }}
        >
          🏆 The Tournament
        </h2>
        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "var(--text-lg)",
            color: "var(--text-secondary)",
            maxWidth: "560px",
            margin: "0 auto",
          }}
        >
          Watch trust evolve. All 9 strategies compete in a round-robin
          tournament — the weak are eliminated, the strong reproduce.
        </p>
      </div>
      <TournamentMode />
    </div>
  );
};

export default TournamentPage;
