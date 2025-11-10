import React, { useState, useEffect } from "react";
import { Button, Text } from "@stellar/design-system";
import AudioManager from "./AudioManager";
import "../styles/slides.css";

// SINGLE SOURCE OF TRUTH for slide configuration
export interface SlideConfig {
  id: string;
  title?: string;
  subtitle?: string;
  component: React.ComponentType<SlideProps>;
  music?: string;
  background?: string;
}

export interface SlideProps {
  onNext: () => void;
  onPrev: () => void;
  slideData?: any;
}

interface SlideSystemProps {
  slides: SlideConfig[];
  onComplete?: () => void;
}

export const SlideSystem: React.FC<SlideSystemProps> = ({ slides, onComplete }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slideData, setSlideData] = useState<any>({});
  const [audioManager] = useState(() => AudioManager.getInstance());

  // PERFORMANT: Initialize audio on first load
  useEffect(() => {
    audioManager.preloadSounds();
    
    // Start background music if available
    const firstSlideMusic = slides[0]?.music;
    if (firstSlideMusic) {
      audioManager.playBackgroundMusic(firstSlideMusic);
    }
  }, [audioManager, slides]);

  // ENHANCEMENT: Handle slide changes with audio
  useEffect(() => {
    const currentSlideConfig = slides[currentSlide];
    if (currentSlideConfig?.music) {
      audioManager.playBackgroundMusic(currentSlideConfig.music);
    }
    
    // Play slide transition sound
    if (currentSlide > 0) {
      audioManager.playSound("click");
    }
  }, [currentSlide, slides, audioManager]);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onComplete?.();
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleSlideJump = (index: number) => {
    setCurrentSlide(index);
    audioManager.playSound("click");
  };

  const currentSlideConfig = slides[currentSlide];
  const SlideComponent = currentSlideConfig.component;

  return (
    <div className="slide-container" style={{ 
      background: currentSlideConfig.background || "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" 
    }}>
      {/* ENHANCEMENT: Audio controls */}
      <div className="audio-controls">
        <button
          className={`audio-button ${!audioManager.isMusicEnabled ? 'disabled' : ''}`}
          onClick={() => audioManager.toggleMusic()}
          title="Toggle Music"
        >
          {audioManager.isMusicEnabled ? "🎵" : "🔇"}
        </button>
        <button
          className={`audio-button ${!audioManager.isSFXEnabled ? 'disabled' : ''}`}
          onClick={() => audioManager.toggleSFX()}
          title="Toggle Sound Effects"
        >
          {audioManager.isSFXEnabled ? "🔊" : "🔈"}
        </button>
      </div>

      {/* CLEAN: Progress indicator */}
      <div className="slide-progress">
        {slides.map((_, index) => (
          <button
            key={index}
            className={`progress-dot ${currentSlide === index ? 'active' : ''}`}
            onClick={() => handleSlideJump(index)}
          />
        ))}
      </div>

      {/* MODULAR: Slide content */}
      <div className="slide-content">
        {currentSlideConfig.title && (
          <Text as="h1" className="slide-title fade-in">
            {currentSlideConfig.title}
          </Text>
        )}
        
        {currentSlideConfig.subtitle && (
          <Text as="h2" className="slide-subtitle fade-in">
            {currentSlideConfig.subtitle}
          </Text>
        )}

        <div className="bounce-in">
          <SlideComponent 
            onNext={handleNext}
            onPrev={handlePrev}
            slideData={slideData}
          />
        </div>
      </div>

      {/* CLEAN: Navigation */}
      <div className="slide-navigation">
        <Button variant="secondary"
          onClick={handlePrev}
          disabled={currentSlide === 0} size="md">
          ← Previous
        </Button>
        
        <Button variant="primary"
          onClick={handleNext} size="md">
          {currentSlide === slides.length - 1 ? "Complete" : "Next →"}
        </Button>
      </div>
    </div>
  );
};
