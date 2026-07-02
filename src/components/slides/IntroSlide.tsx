import React from "react";
import { SlideProps } from "../SlideSystem";

export const IntroSlide: React.FC<SlideProps> = () => {
  return (
    <div style={{ textAlign: "center", padding: "40px 20px" }}>
      <div
        data-animate
        style={{
          fontSize: "64px",
          marginBottom: "24px",
          filter: "drop-shadow(0 0 24px rgba(102, 126, 234, 0.4))",
        }}
      >
        🤝
      </div>

      <p
        data-animate
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "var(--text-2xl)",
          maxWidth: "640px",
          margin: "0 auto 32px",
          lineHeight: 1.4,
          color: "var(--text-primary)",
        }}
      >
        An interactive guide to why & how we trust each other — now with
        zero-knowledge proofs and real stakes
      </p>

      <p
        data-animate
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "var(--text-base)",
          color: "var(--accent-violet)",
          fontWeight: 600,
          letterSpacing: "0.02em",
        }}
      >
        Now with <strong>real XLM stakes</strong> that make every decision count
      </p>

      <div data-animate style={{ marginTop: "48px" }}>
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: "var(--text-lg)",
            color: "var(--text-muted)",
            lineHeight: 1.6,
          }}
        >
          "The question isn't whether you can trust someone.
          <br />
          The question is whether you can trust someone{" "}
          <em style={{ color: "var(--accent-warm)" }}>enough</em>."
        </p>
      </div>
    </div>
  );
};
