import React, { useState } from "react";
import { Button, Text } from "@stellar/design-system";
import { useWallet } from "../../hooks/useWallet";
import { SlideProps } from "../SlideSystem";

export const ConclusionSlide: React.FC<SlideProps> = ({ onNext }) => {
  const [showApplications, setShowApplications] = useState(false);
  const { address } = useWallet();

  const realWorldApplications = [
    {
      title: "🏦 DeFi Protocols",
      description: "Reputation systems for lending, staking rewards for good behavior"
    },
    {
      title: "🌐 Social Networks", 
      description: "Trust scores, content moderation, community governance"
    },
    {
      title: "🛒 Marketplaces",
      description: "Seller ratings, buyer protection, dispute resolution"
    },
    {
      title: "🏛️ Governance",
      description: "Voting systems, coalition building, policy cooperation"
    },
    {
      title: "🌍 Climate Action",
      description: "Carbon credits, international cooperation, tragedy of commons"
    }
  ];

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", textAlign: "center" }}>
      <div style={{ fontSize: "60px", marginBottom: "20px" }}>🌟</div>
      
      <Text as="p" size="md" style={{ 
        fontFamily: "FuturaHandwritten", 
        color: "rgba(255,255,255,0.9)",
        fontSize: "1.2rem",
        marginBottom: "30px",
        lineHeight: "1.6"
      }}>
        So, what have we learned about trust?
      </Text>

      <div style={{ 
        background: "rgba(255,255,255,0.9)", 
        padding: "30px", 
        borderRadius: "20px",
        marginBottom: "30px"
      }}>
        <Text as="h3" size="md" style={{ 
          fontFamily: "FuturaHandwritten",
          color: "#333",
          marginBottom: "20px"
        }}>
          The Rules of Trust
        </Text>
        
        <div style={{ textAlign: "left", maxWidth: "400px", margin: "0 auto" }}>
          <div style={{ marginBottom: "15px" }}>
            <Text as="p" size="md" style={{ fontFamily: "FuturaHandwritten", color: "#4CAF50", fontWeight: "bold" }}>
              1. Be Nice
            </Text>
            <Text as="p" size="md" style={{ fontFamily: "FuturaHandwritten", color: "#666", fontSize: "0.9rem" }}>
              Don't defect first. Start with cooperation.
            </Text>
          </div>
          
          <div style={{ marginBottom: "15px" }}>
            <Text as="p" size="md" style={{ fontFamily: "FuturaHandwritten", color: "#F44336", fontWeight: "bold" }}>
              2. Be Provocable
            </Text>
            <Text as="p" size="md" style={{ fontFamily: "FuturaHandwritten", color: "#666", fontSize: "0.9rem" }}>
              Retaliate against defection. Don't be a pushover.
            </Text>
          </div>
          
          <div style={{ marginBottom: "15px" }}>
            <Text as="p" size="md" style={{ fontFamily: "FuturaHandwritten", color: "#2196F3", fontWeight: "bold" }}>
              3. Be Forgiving
            </Text>
            <Text as="p" size="md" style={{ fontFamily: "FuturaHandwritten", color: "#666", fontSize: "0.9rem" }}>
              Return to cooperation after punishment.
            </Text>
          </div>
          
          <div>
            <Text as="p" size="md" style={{ fontFamily: "FuturaHandwritten", color: "#9C27B0", fontWeight: "bold" }}>
              4. Be Clear
            </Text>
            <Text as="p" size="md" style={{ fontFamily: "FuturaHandwritten", color: "#666", fontSize: "0.9rem" }}>
              Make your strategy easy to understand.
            </Text>
          </div>
        </div>
      </div>

      <Button onClick={() = size="md"> setShowApplications(!showApplications)}
        style={{ 
          fontFamily: "FuturaHandwritten",
          marginBottom: "20px",
          background: "rgba(255,255,255,0.9)",
          color: "#667eea"
        }}
      >
        {showApplications ? "Hide" : "Show"} Real-World Applications
      </Button>

      {showApplications && (
        <div style={{ 
          background: "rgba(255,255,255,0.8)", 
          padding: "25px", 
          borderRadius: "15px",
          marginBottom: "30px"
        }}>
          <Text as="h4" size="md" style={{ 
            fontFamily: "FuturaHandwritten",
            color: "#333",
            marginBottom: "20px"
          }}>
            Trust in the Real World
          </Text>
          
          {realWorldApplications.map((app, index) => (
            <div key={index} style={{ 
              textAlign: "left",
              marginBottom: "15px",
              padding: "10px",
              background: "rgba(255,255,255,0.5)",
              borderRadius: "8px"
            }}>
              <Text as="p" size="md" style={{ 
                fontFamily: "FuturaHandwritten", 
                fontWeight: "bold",
                color: "#333",
                marginBottom: "5px"
              }}>
                {app.title}
              </Text>
              <Text as="p" size="md" style={{ 
                fontFamily: "FuturaHandwritten", 
                color: "#666",
                fontSize: "0.9rem"
              }}>
                {app.description}
              </Text>
            </div>
          ))}
        </div>
      )}

      <Text as="p" size="md" style={{ 
        fontFamily: "FuturaHandwritten",
        color: "rgba(255,255,255,0.9)",
        fontSize: "1.1rem",
        fontStyle: "italic",
        marginBottom: "30px",
        lineHeight: "1.5"
      }}>
        "In the end, we're all in this together. The question isn't whether you <em>can</em> trust someone.
        <br/>The question is whether you can trust someone <strong>enough</strong>."
      </Text>

      {address && (
        <div style={{ 
          background: "rgba(255,255,255,0.9)", 
          padding: "20px", 
          borderRadius: "15px",
          marginBottom: "20px"
        }}>
          <Text as="p" size="md" style={{ 
            fontFamily: "FuturaHandwritten",
            color: "#333",
            marginBottom: "15px"
          }}>
            🎉 Congratulations! You've completed the journey.
          </Text>
          <Text as="p" size="md" style={{ 
            fontFamily: "FuturaHandwritten",
            color: "#667eea",
            fontSize: "0.9rem"
          }}>
            Your wallet: {address.slice(0, 8)}...{address.slice(-8)}
            <br/>Ready to build trust in the real world?
          </Text>
        </div>
      )}

      <Text as="p" size="md" style={{ 
        fontFamily: "FuturaHandwritten",
        color: "rgba(255,255,255,0.7)",
        fontSize: "0.8rem",
        marginTop: "30px"
      }}>
        Based on "The Evolution of Trust" by Nicky Case
        <br/>Enhanced with blockchain technology on Stellar
      </Text>
    </div>
  );
};
