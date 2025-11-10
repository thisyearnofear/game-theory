import React from "react";
import { Text } from "@stellar/design-system";
import { PrisonersDilemma } from "../components/PrisonersDilemma";
import "../styles/slides.css";
import "../styles/balloon.css";

const Home: React.FC = () => {
  return (
    <div className="slide-container">
      <div style={{ 
        maxWidth: "800px", 
        margin: "0 auto", 
        padding: "40px 20px",
        minHeight: "100vh",
        textAlign: "center"
      }}>
        
        {/* Header Card */}
        <div style={{
          background: "rgba(255,255,255,0.95)",
          borderRadius: "20px",
          padding: "40px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
          marginBottom: "30px"
        }}>
          <Text as="h1" style={{ 
            fontFamily: "FuturaHandwritten",
            color: "#333",
            fontSize: "2.5rem",
            marginBottom: "20px"
          }}>
            Trust with Real Consequences
          </Text>
          
          <Text as="p" style={{ 
            fontFamily: "FuturaHandwritten",
            color: "#666",
            fontSize: "1.2rem",
            lineHeight: "1.6"
          }}>
            Unlike simulations, this game requires "skin in the game."<br/>
            Stake your XLM and discover how trust works when it truly matters.
          </Text>
        </div>

        {/* Game Interface Card */}
        <div style={{
          background: "rgba(255,255,255,0.95)",
          borderRadius: "20px",
          padding: "30px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
          margin: "30px 0"
        }}>
          <PrisonersDilemma />
        </div>

        {/* Quote */}
        <div style={{ 
          padding: "30px",
          color: "rgba(255,255,255,0.9)",
          fontFamily: "FuturaHandwritten",
          fontSize: "1.3rem",
          fontStyle: "italic",
          textShadow: "1px 1px 2px rgba(0,0,0,0.3)"
        }}>
          "In the end, we are all in this together. The question is: will you cooperate?"
        </div>
      </div>
      
      {/* Footer */}
      <div style={{ 
        textAlign: "center", 
        padding: "20px",
        color: "rgba(255,255,255,0.6)",
        fontFamily: "FuturaHandwritten",
        fontSize: "14px"
      }}>
        Inspired by Nicky Case's "Evolution of Trust" • Built on Stellar
      </div>
    </div>
  );
};

export default Home;
