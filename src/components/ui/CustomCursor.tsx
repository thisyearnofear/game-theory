/**
 * CustomCursor — a trailing circle that follows the native cursor.
 *
 * - Expands when hovering interactive elements (buttons, links, cards)
 * - Color-shifts to green over Cooperate buttons, red over Defect buttons
 * - Uses lerp for smooth trailing motion
 * - Hidden on touch devices
 */

import React, { useEffect, useRef } from "react";

export const CustomCursor: React.FC = () => {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Skip on touch devices
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ringX = mouseX;
    let ringY = mouseY;
    let dotX = mouseX;
    let dotY = mouseY;
    let rafId: number;
    let hoverState: "default" | "interactive" | "cooperate" | "defect" =
      "default";

    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;

      // Check what we're hovering
      const target = e.target as HTMLElement;
      const interactive = target.closest(
        "button, a, [role='button'], .strategy-card, input, label, [data-cursor]",
      );
      const cooperate = target.closest("[data-cursor='cooperate']");
      const defect = target.closest("[data-cursor='defect']");

      if (cooperate) hoverState = "cooperate";
      else if (defect) hoverState = "defect";
      else if (interactive) hoverState = "interactive";
      else hoverState = "default";
    };

    const render = () => {
      // Dot follows tightly
      dotX += (mouseX - dotX) * 0.5;
      dotY += (mouseY - dotY) * 0.5;
      dot.style.transform = `translate(${dotX}px, ${dotY}px)`;

      // Ring trails behind
      ringX += (mouseX - ringX) * 0.15;
      ringY += (mouseY - ringY) * 0.15;

      const scale = hoverState === "default" ? 1 : 1.8;
      const color =
        hoverState === "cooperate"
          ? "rgba(74,222,128,0.6)"
          : hoverState === "defect"
            ? "rgba(248,113,113,0.6)"
            : hoverState === "interactive"
              ? "rgba(102,126,234,0.5)"
              : "rgba(160,180,255,0.3)";

      const borderColor =
        hoverState === "cooperate"
          ? "rgba(74,222,128,0.8)"
          : hoverState === "defect"
            ? "rgba(248,113,113,0.8)"
            : hoverState === "interactive"
              ? "rgba(102,126,234,0.7)"
              : "rgba(160,180,255,0.4)";

      ring.style.transform = `translate(${ringX}px, ${ringY}px) scale(${scale})`;
      ring.style.borderColor = borderColor;
      ring.style.background = hoverState === "default" ? "transparent" : color;
      ring.style.borderWidth = hoverState === "default" ? "1px" : "2px";

      rafId = requestAnimationFrame(render);
    };

    window.addEventListener("mousemove", onMouseMove);
    rafId = requestAnimationFrame(render);

    // Hide native cursor only on desktop
    document.body.style.cursor = "none";

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      cancelAnimationFrame(rafId);
      document.body.style.cursor = "";
    };
  }, []);

  return (
    <>
      <div
        ref={dotRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          background: "rgba(255,255,255,0.9)",
          pointerEvents: "none",
          zIndex: 99999,
          marginLeft: "-3px",
          marginTop: "-3px",
          transition: "background 0.2s",
        }}
      />
      <div
        ref={ringRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "32px",
          height: "32px",
          borderRadius: "50%",
          border: "1px solid rgba(160,180,255,0.4)",
          pointerEvents: "none",
          zIndex: 99998,
          marginLeft: "-16px",
          marginTop: "-16px",
          transition:
            "border-color 0.25s, background 0.25s, border-width 0.25s",
        }}
      />
    </>
  );
};
