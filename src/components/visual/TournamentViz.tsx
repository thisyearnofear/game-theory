/**
 * TournamentViz — Animated population visualization for tournament mode.
 *
 * Renders a horizontal bar for each strategy in the population. Bar widths are
 * proportional to each strategy's count and animate via GSAP whenever the
 * population changes. The current generation is displayed at the top.
 */

import { useEffect, useRef } from "react";
import gsap from "gsap";

interface PopulationEntry {
  strategyId: string;
  name: string;
  emoji: string;
  color: string;
  count: number;
}

interface TournamentVizProps {
  population: PopulationEntry[];
  generation: number;
  maxCount?: number;
}

const TournamentViz: React.FC<TournamentVizProps> = ({
  population,
  generation,
  maxCount,
}) => {
  const barsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const countsRef = useRef<Map<string, HTMLSpanElement>>(new Map());

  const computedMax =
    maxCount ?? Math.max(1, ...population.map((p) => p.count));
  const totalCount = population.reduce((sum, p) => sum + p.count, 0);
  const isEmpty = totalCount === 0 || population.length === 0;

  // Animate bar widths + count numbers whenever population changes.
  useEffect(() => {
    const tl = gsap.timeline();
    population.forEach((entry) => {
      const barEl = barsRef.current.get(entry.strategyId);
      const countEl = countsRef.current.get(entry.strategyId);
      const targetWidth =
        computedMax > 0 ? (entry.count / computedMax) * 100 : 0;

      if (barEl) {
        tl.to(
          barEl,
          { width: `${targetWidth}%`, duration: 0.6, ease: "power3.out" },
          0,
        );
      }
      if (countEl) {
        const obj = { val: parseFloat(countEl.textContent ?? "0") || 0 };
        tl.to(
          obj,
          {
            val: entry.count,
            duration: 0.6,
            ease: "power3.out",
            onUpdate: () => {
              countEl.textContent = String(Math.round(obj.val));
            },
          },
          0,
        );
      }
    });

    return () => {
      tl.kill();
    };
  }, [population, computedMax]);

  const setBarRef = (id: string) => (el: HTMLDivElement | null) => {
    if (el) barsRef.current.set(id, el);
    else barsRef.current.delete(id);
  };

  const setCountRef = (id: string) => (el: HTMLSpanElement | null) => {
    if (el) countsRef.current.set(id, el);
    else countsRef.current.delete(id);
  };

  const headerStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 16,
  };

  const generationStyle: React.CSSProperties = {
    fontFamily: "var(--font-display)",
    fontSize: "1.25rem",
    color: "var(--text-primary)",
    margin: 0,
  };

  const totalStyle: React.CSSProperties = {
    fontFamily: "var(--font-body)",
    fontSize: "0.8rem",
    color: "var(--text-muted)",
  };

  const rowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  };

  const labelStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: 120,
    flexShrink: 0,
    fontFamily: "var(--font-body)",
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
  };

  const trackStyle: React.CSSProperties = {
    flex: 1,
    height: 22,
    background: "var(--bg-glass-light)",
    borderRadius: 11,
    overflow: "hidden",
    position: "relative",
  };

  const barStyle = (color: string): React.CSSProperties => ({
    height: "100%",
    width: 0,
    background: `linear-gradient(90deg, ${color}cc, ${color})`,
    borderRadius: 11,
    boxShadow: `0 0 12px ${color}55`,
  });

  const countStyle: React.CSSProperties = {
    width: 40,
    textAlign: "right",
    fontFamily: "var(--font-mono, monospace)",
    fontSize: "0.85rem",
    color: "var(--text-primary)",
    flexShrink: 0,
  };

  const emptyStyle: React.CSSProperties = {
    padding: "32px 16px",
    textAlign: "center",
    fontFamily: "var(--font-body)",
    fontSize: "0.9rem",
    color: "var(--text-muted)",
    fontStyle: "italic",
  };

  return (
    <div>
      <div style={headerStyle}>
        <h4 style={generationStyle}>Generation {generation}</h4>
        <span style={totalStyle}>{totalCount} agents</span>
      </div>

      {isEmpty ? (
        <div style={emptyStyle}>
          No agents remaining. The population has gone extinct.
        </div>
      ) : (
        <div>
          {population.map((entry) => (
            <div key={entry.strategyId} style={rowStyle}>
              <div style={labelStyle}>
                <span style={{ fontSize: "1.1rem" }}>{entry.emoji}</span>
                <span>{entry.name}</span>
              </div>
              <div style={trackStyle}>
                <div
                  ref={setBarRef(entry.strategyId)}
                  style={barStyle(entry.color)}
                />
              </div>
              <span ref={setCountRef(entry.strategyId)} style={countStyle}>
                {entry.count}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TournamentViz;
