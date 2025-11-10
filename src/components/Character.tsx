import React, { useState, useEffect } from "react";
import { AIPersona } from "./ai/AIPersonas";

// DRY: Character types and animations
export type CharacterType = "cooperator" | "defector" | "neutral" | "ai-tutor";
export type CharacterEmotion = "happy" | "sad" | "angry" | "thinking" | "neutral" | "wise" | "excited";

interface CharacterProps {
  type: CharacterType;
  emotion?: CharacterEmotion;
  size?: "small" | "medium" | "large";
  animate?: boolean;
  persona?: AIPersona; // ENHANCEMENT: AI persona support
  onClick?: () => void;
  showSpeechBubble?: boolean;
  speechText?: string;
}

// PERFORMANT: CSS-based animations instead of heavy sprites
export const Character: React.FC<CharacterProps> = ({ 
  type, 
  emotion = "neutral", 
  size = "medium", 
  animate = false,
  persona,
  onClick,
  showSpeechBubble = false,
  speechText = ""
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [showBubble, setShowBubble] = useState(false);

  useEffect(() => {
    if (animate) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 600);
      return () => clearTimeout(timer);
    }
  }, [animate]);

  useEffect(() => {
    if (showSpeechBubble && speechText) {
      setShowBubble(true);
      const timer = setTimeout(() => setShowBubble(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showSpeechBubble, speechText]);

  const sizeMap = {
    small: "40px",
    medium: "60px", 
    large: "80px"
  };

  const colorMap = {
    cooperator: "#4CAF50",
    defector: "#F44336",
    neutral: "#9E9E9E",
    "ai-tutor": "#667eea" // ENHANCEMENT: AI tutor color
  };

  const emotionMap = {
    happy: "😊",
    sad: "😢", 
    angry: "😠",
    thinking: "🤔",
    neutral: "😐",
    wise: "🧙‍♂️",
    excited: "🤩"
  };

  // ENHANCEMENT: Use persona avatar if available
  const displayEmoji = persona?.avatar || emotionMap[emotion];

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      {/* ENHANCEMENT: Speech bubble */}
      {showBubble && speechText && (
        <div style={{
          position: "absolute",
          bottom: "100%",
          left: "50%",
          transform: "translateX(-50%)",
          background: "white",
          padding: "8px 12px",
          borderRadius: "15px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
          fontSize: "12px",
          fontFamily: "FuturaHandwritten",
          color: "#333",
          maxWidth: "200px",
          textAlign: "center",
          marginBottom: "5px",
          animation: "fadeIn 0.3s ease-out",
          zIndex: 10
        }}>
          {speechText}
          {/* Speech bubble tail */}
          <div style={{
            position: "absolute",
            top: "100%",
            left: "50%",
            transform: "translateX(-50%)",
            width: 0,
            height: 0,
            borderLeft: "6px solid transparent",
            borderRight: "6px solid transparent",
            borderTop: "6px solid white"
          }} />
        </div>
      )}

      <div
        onClick={onClick}
        style={{
          width: sizeMap[size],
          height: sizeMap[size],
          borderRadius: "50%",
          background: type === "ai-tutor" 
            ? `linear-gradient(135deg, ${colorMap[type]} 0%, #764ba2 100%)`
            : colorMap[type],
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: size === "large" ? "24px" : size === "medium" ? "18px" : "14px",
          cursor: onClick ? "pointer" : "default",
          transition: "all 0.3s ease",
          transform: isAnimating ? "scale(1.2) rotate(10deg)" : "scale(1)",
          boxShadow: isAnimating ? "0 5px 15px rgba(0,0,0,0.3)" : "0 2px 5px rgba(0,0,0,0.2)",
          position: "relative",
          overflow: "hidden"
        }}
        className={`character character-${type} ${isAnimating ? 'character-animate' : ''}`}
      >
        <span style={{ zIndex: 2 }}>{displayEmoji}</span>
        
        {/* ENHANCEMENT: Persona name badge */}
        {persona && size === "large" && (
          <div style={{
            position: "absolute",
            bottom: "-5px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(255,255,255,0.9)",
            padding: "2px 6px",
            borderRadius: "10px",
            fontSize: "8px",
            fontFamily: "FuturaHandwritten",
            color: "#333",
            fontWeight: "bold"
          }}>
            {persona.name}
          </div>
        )}
        
        {/* CLEAN: Animated background effect */}
        {isAnimating && (
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `radial-gradient(circle, ${colorMap[type]}aa 0%, transparent 70%)`,
            animation: "pulse 0.6s ease-out"
          }} />
        )}
      </div>
    </div>
  );
};
