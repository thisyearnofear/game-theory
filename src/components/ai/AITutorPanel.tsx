import React, { useState, useEffect } from "react";
import { Button, Text } from "@stellar/design-system";
import { Character } from "../Character";
import { AIPersona, selectPersonaForContext } from "./AIPersonas";
import { VeniceAIService } from "./VeniceAIService";
import AudioManager from "../AudioManager";

interface AITutorPanelProps {
  context: string;
  gameState?: any;
  playerAction?: string;
  onAdviceRequest?: () => void;
  visible?: boolean;
}

export const AITutorPanel: React.FC<AITutorPanelProps> = ({
  context,
  gameState,
  playerAction,
  onAdviceRequest,
  visible = true
}) => {
  const [persona] = useState(() => selectPersonaForContext(context));
  const [currentMessage, setCurrentMessage] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [veniceService] = useState(() => VeniceAIService.getInstance());
  const audioManager = AudioManager.getInstance();

  // ENHANCEMENT: Auto-show tutor with AI-generated welcome
  useEffect(() => {
    const initializeTutor = async () => {
      setShowPanel(true);
      setIsThinking(true);
      
      try {
        const welcomeMessage = await veniceService.generateTutorAdvice(
          persona.name,
          persona.personality,
          {},
          "welcome"
        );
        setCurrentMessage(welcomeMessage);
      } catch (error) {
        setCurrentMessage(getWelcomeMessage(persona));
      } finally {
        setIsThinking(false);
      }
    };

    const timer = setTimeout(initializeTutor, 1000);
    return () => clearTimeout(timer);
  }, [persona, veniceService]);

  // MODULAR: React to player actions with AI analysis
  useEffect(() => {
    if (playerAction && gameState) {
      generateAIResponse("explanation");
    }
  }, [playerAction, gameState]);

  const generateAIResponse = async (type: "advice" | "explanation" | "encouragement") => {
    setIsThinking(true);
    audioManager.playSound("click");
    
    try {
      const response = await veniceService.generateTutorAdvice(
        persona.name,
        persona.personality,
        gameState,
        type
      );
      setCurrentMessage(response);
    } catch (error) {
      setCurrentMessage(getFallbackMessage(persona, type));
    } finally {
      setIsThinking(false);
    }
  };

  const getWelcomeMessage = (persona: AIPersona): string => {
    return `Hello! I'm ${persona.name}. ${persona.catchphrases[0]}`;
  };

  const getFallbackMessage = (persona: AIPersona, type: string): string => {
    const messages = {
      advice: `${persona.catchphrases[1]} Consider the strategic implications.`,
      explanation: `${persona.catchphrases[0]} This demonstrates key principles of ${persona.specialties[0]}.`,
      encouragement: `${persona.catchphrases[2]} You're mastering ${persona.specialties[0]}!`
    };
    return messages[type as keyof typeof messages] || persona.catchphrases[0];
  };

  const requestAdvice = () => {
    generateAIResponse("advice");
    onAdviceRequest?.();
  };

  const requestEncouragement = () => {
    generateAIResponse("encouragement");
  };

  if (!visible) return null;

  return (
    <div style={{
      position: "fixed",
      bottom: showPanel ? "20px" : "-250px",
      right: "20px",
      width: "320px",
      background: "rgba(255,255,255,0.95)",
      borderRadius: "15px",
      padding: "20px",
      boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
      transition: "bottom 0.5s ease-out",
      zIndex: 50,
      fontFamily: "FuturaHandwritten",
      backdropFilter: "blur(10px)"
    }}>
      {/* CLEAN: Header with persona and AI indicator */}
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        marginBottom: "15px",
        borderBottom: "1px solid #eee",
        paddingBottom: "10px"
      }}>
        <Character 
          type="ai-tutor" 
          emotion={isThinking ? "thinking" : "wise"}
          size="medium"
          persona={persona}
          animate={isThinking}
        />
        <div style={{ marginLeft: "10px", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Text as="h4" size="md" style={{ 
              margin: 0, 
              color: "#333",
              fontSize: "1rem"
            }}>
              {persona.name}
            </Text>
            {veniceService.isAvailable() && (
              <span style={{
                background: "#4CAF50",
                color: "white",
                fontSize: "10px",
                padding: "2px 6px",
                borderRadius: "8px",
                fontWeight: "bold"
              }}>
                AI
              </span>
            )}
          </div>
          <Text as="p" size="md" style={{ 
            margin: 0, 
            color: "#666",
            fontSize: "0.8rem"
          }}>
            {persona.description}
          </Text>
        </div>
        
        {/* CLEAN: Minimize button */}
        <Button 
          onClick={() => setShowPanel(!showPanel)}
          size="md"
          style={{
            width: "30px",
            height: "30px",
            borderRadius: "50%",
            padding: 0,
            fontSize: "12px"
          }}
        >
          {showPanel ? "−" : "+"}
        </Button>
      </div>

      {/* MODULAR: Message area with typing indicator */}
      <div style={{
        minHeight: "80px",
        marginBottom: "15px",
        padding: "15px",
        background: "#f8f9fa",
        borderRadius: "10px",
        border: "1px solid #e9ecef"
      }}>
        {isThinking ? (
          <div style={{ 
            display: "flex", 
            alignItems: "center",
            color: "#666"
          }}>
            <span style={{ marginRight: "10px", fontSize: "16px" }}>🤔</span>
            <div>
              <Text as="p" size="md" style={{ 
                margin: 0,
                fontSize: "0.9rem",
                fontStyle: "italic"
              }}>
                {persona.name} is thinking...
              </Text>
              {veniceService.isAvailable() && (
                <Text as="p" size="md" style={{ 
                  margin: 0,
                  fontSize: "0.7rem",
                  color: "#999"
                }}>
                  Powered by Venice AI
                </Text>
              )}
            </div>
          </div>
        ) : (
          <Text as="p" size="md" style={{ 
            margin: 0,
            color: "#333",
            fontSize: "0.9rem",
            lineHeight: "1.4"
          }}>
            {currentMessage}
          </Text>
        )}
      </div>

      {/* ENHANCEMENT: Smart action buttons */}
      <div style={{ 
        display: "flex", 
        gap: "8px",
        justifyContent: "space-between"
      }}>
        <Button onClick={requestAdvice}
          disabled={isThinking}
          style={{
            fontSize: "0.8rem",
            padding: "8px 12px",
            flex: 1
          }} size="md">
          💡 Advice
        </Button>
        
        <Button onClick={requestEncouragement}
          disabled={isThinking}
          variant="secondary"
          style={{
            fontSize: "0.8rem",
            padding: "8px 12px",
            flex: 1
          }} size="md">
          🎉 Encourage
        </Button>
        
        <Button 
          onClick={() => setCurrentMessage(persona.catchphrases[Math.floor(Math.random() * persona.catchphrases.length)])}
          variant="secondary"
          size="md"
          disabled={isThinking}
          style={{
            fontSize: "0.8rem",
            padding: "8px 10px",
            minWidth: "40px"
          }}
        >
          🎲
        </Button>
      </div>

      {/* CLEAN: Service status indicator */}
      {!veniceService.isAvailable() && (
        <Text as="p" size="md" style={{
          fontSize: "0.7rem",
          color: "#999",
          textAlign: "center",
          marginTop: "8px",
          fontStyle: "italic"
        }}>
          Using offline responses • Add VITE_VENICE_API_KEY for AI
        </Text>
      )}
    </div>
  );
};
