/**
 * NoiseSlide — Step 6: "The Noise"
 *
 * What happens when signals get garbled? A cooperative move might be
 * received as defection. The user adjusts a noise slider and watches
 * how trust collapses.
 *
 * Runs a quick simulation: TFT vs TFT with varying noise levels.
 */

import React, { useState, useCallback } from "react";
import { SlideProps } from "../SlideSystem";
import { unlockAchievement } from "../ui/AchievementBadge";
import { ElectricButton } from "../ui/ElectricButton";
import {
  createStrategy,
  playRepeatedGame,
  NC_DEFAULT,
} from "../../util/strategies";

interface SimResult {
  noise: number;
  avgCooperation: number;
  avgScore: number;
}

function runSim(noise: number, rounds = 50): SimResult {
  const sA = createStrategy("tft");
  const sB = createStrategy("tft");
  const result = playRepeatedGame(sA, sB, rounds, noise, NC_DEFAULT);

  // Count cooperative moves
  let coopCount = 0;
  result.moves.forEach((m) => {
    if (m.a === "C") coopCount++;
    if (m.b === "C") coopCount++;
  });
  const avgCooperation = coopCount / (rounds * 2);
  const avgScore = (result.totalA + result.totalB) / 2;

  return { noise, avgCooperation, avgScore };
}

export const NoiseSlide: React.FC<SlideProps> = ({ onNext }) => {
  const [noise, setNoise] = useState(0);
  const [result, setResult] = useState<SimResult | null>(null);
  const [running, setRunning] = useState(false);

  const runSimulation = useCallback(() => {
    setRunning(true);
    setTimeout(() => {
      const r = runSim(noise);
      setResult(r);
      setRunning(false);
      unlockAchievement("noise_master");
    }, 300);
  }, [noise]);

  const coopPercent = result ? Math.round(result.avgCooperation * 100) : 0;
  const scoreLabel = result ? result.avgScore.toFixed(1) : "—";

  return (
    <div style={{ maxWidth: "640px", margin: "0 auto", textAlign: "center" }}>
      <h2
        data-animate
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "var(--text-3xl)",
          marginBottom: "12px",
        }}
      >
        The Noise
      </h2>

      <p
        data-animate
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "var(--text-base)",
          color: "var(--text-secondary)",
          marginBottom: "8px",
        }}
      >
        What if a cooperative signal gets garbled? You meant to catch — but they
        thought you stepped aside. Misunderstanding breeds mistrust.
      </p>

      <p
        data-animate
        style={{
          fontFamily: "var(--font-display)",
          fontStyle: "italic",
          fontSize: "var(--text-lg)",
          color: "var(--text-muted)",
          marginBottom: "32px",
        }}
      >
        Two Tit-for-Tat players. Perfect partners. Add noise — watch what
        happens.
      </p>

      {/* Noise slider */}
      <div
        data-animate
        className="glass-panel"
        style={{ padding: "24px", marginBottom: "24px" }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "12px",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-sm)",
              color: "var(--text-muted)",
              margin: 0,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            Noise Level
          </p>
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-xl)",
              color: "var(--accent-warm)",
              margin: 0,
            }}
          >
            {Math.round(noise * 100)}%
          </p>
        </div>

        <input
          type="range"
          min="0"
          max="0.5"
          step="0.05"
          value={noise}
          onChange={(e) => {
            setNoise(parseFloat(e.target.value));
            setResult(null);
          }}
          style={{
            width: "100%",
            height: "6px",
            borderRadius: "3px",
            background: "rgba(255,255,255,0.1)",
            appearance: "none",
            outline: "none",
            cursor: "pointer",
          }}
        />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "8px",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-xs)",
              color: "var(--text-muted)",
            }}
          >
            Perfect signals
          </span>
          <span
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-xs)",
              color: "var(--text-muted)",
            }}
          >
            Chaos
          </span>
        </div>

        <ElectricButton
          onClick={runSimulation}
          disabled={running}
          color="warm"
          size="md"
          style={{ marginTop: "16px" }}
        >
          {running ? "Running 50 rounds..." : "▶ Simulate 50 rounds"}
        </ElectricButton>
      </div>

      {/* Results */}
      {result && (
        <div data-animate>
          <div
            className="glass-panel"
            style={{
              padding: "24px",
              marginBottom: "24px",
              borderColor:
                coopPercent > 60
                  ? "rgba(74,222,128,0.3)"
                  : coopPercent > 30
                    ? "rgba(240,160,32,0.3)"
                    : "rgba(248,113,113,0.3)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-around" }}>
              <div>
                <p
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "var(--text-xs)",
                    color: "var(--text-muted)",
                    margin: 0,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                  }}
                >
                  Cooperation rate
                </p>
                <p
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "var(--text-3xl)",
                    color:
                      coopPercent > 60
                        ? "var(--accent-cooperate)"
                        : coopPercent > 30
                          ? "var(--accent-warm)"
                          : "var(--accent-defect)",
                    margin: 0,
                  }}
                >
                  {coopPercent}%
                </p>
              </div>
              <div>
                <p
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "var(--text-xs)",
                    color: "var(--text-muted)",
                    margin: 0,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                  }}
                >
                  Avg score
                </p>
                <p
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "var(--text-3xl)",
                    color: "var(--text-primary)",
                    margin: 0,
                  }}
                >
                  {scoreLabel}
                </p>
              </div>
            </div>

            {/* Cooperation bar */}
            <div
              style={{
                marginTop: "16px",
                height: "8px",
                borderRadius: "4px",
                background: "rgba(255,255,255,0.08)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${coopPercent}%`,
                  background:
                    coopPercent > 60
                      ? "var(--accent-cooperate)"
                      : coopPercent > 30
                        ? "var(--accent-warm)"
                        : "var(--accent-defect)",
                  transition: "width 0.6s var(--ease-out)",
                  borderRadius: "4px",
                }}
              />
            </div>
          </div>

          <p
            data-animate
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "var(--text-lg)",
              color: "var(--text-secondary)",
              marginBottom: "24px",
            }}
          >
            {noise === 0
              ? "Perfect signals — Tit-for-Tat maintains 100% cooperation. Trust is stable."
              : noise < 0.15
                ? "A little noise — cooperation dips but mostly holds. Forgiveness helps."
                : noise < 0.3
                  ? "Moderate noise — misunderstandings cascade. Trust erodes."
                  : "High noise — cooperation collapses. Even perfect partners can't trust each other."}
          </p>
        </div>
      )}

      <div data-animate>
        <ElectricButton onClick={onNext} color="violet" size="md">
          Ready for real stakes? →
        </ElectricButton>
      </div>
    </div>
  );
};
