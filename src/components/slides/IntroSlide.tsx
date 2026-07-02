import React from "react";
import { Text } from "@stellar/design-system";
import { SlideProps } from "../SlideSystem";

export const IntroSlide: React.FC<SlideProps> = () => {
  return (
    <div style={{ textAlign: "center", padding: "40px" }}>
      <div style={{ fontSize: "80px", marginBottom: "20px" }}>🤝</div>

      <Text
        as="p"
        size="lg"
        style={{
          fontFamily: "FuturaHandwritten",
          maxWidth: "600px",
          margin: "0 auto 30px",
        }}
      >
        An interactive guide to why & how we trust each other — now with
        zero-knowledge proofs and real stakes
      </Text>

      <Text
        as="p"
        size="md"
        style={{
          fontFamily: "FuturaHandwritten",
          color: "#667eea",
          fontWeight: "bold",
        }}
      >
        Now with <strong>real XLM stakes</strong> that make every decision count
      </Text>

      <div style={{ marginTop: "40px" }}>
        <Text
          as="p"
          size="sm"
          style={{
            fontFamily: "FuturaHandwritten",
            fontStyle: "italic",
            color: "rgba(255,255,255,0.8)",
          }}
        >
          "The question isn't whether you can trust someone.
          <br />
          The question is whether you can trust someone <em>enough</em>."
        </Text>
      </div>
    </div>
  );
};
