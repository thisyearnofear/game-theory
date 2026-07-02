import React, { useState, useEffect, useCallback } from "react";
import AudioManager from "./AudioManager";
import { useSlideAnimation } from "../hooks/useSlideAnimation";
import JourneyProgress from "./visual/JourneyProgress";
import { ShimmerButton } from "./ui/ShimmerButton";
import { ElectricButton } from "./ui/ElectricButton";
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
  slideData?: Record<string, unknown>;
}

interface SlideSystemProps {
  slides: SlideConfig[];
  onComplete?: () => void;
}

// Icons for the journey progress — mapped by slide index
const JOURNEY_ICONS = ["🪂", "🏔️", "🤝", "🔄", "⚔️", "🏆", "💨", "🔒"];

export const SlideSystem: React.FC<SlideSystemProps> = ({
  slides,
  onComplete,
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slideData] = useState<Record<string, unknown>>({});
  const [audioManager] = useState(() => AudioManager.getInstance());

  // Initialize audio on first load
  useEffect(() => {
    audioManager.preloadSounds();

    const firstSlideMusic = slides[0]?.music;
    if (firstSlideMusic) {
      audioManager.playBackgroundMusic(firstSlideMusic);
    }
  }, [audioManager, slides]);

  // Handle slide changes with audio
  useEffect(() => {
    const currentSlideConfig = slides[currentSlide];
    if (currentSlideConfig?.music) {
      audioManager.playBackgroundMusic(currentSlideConfig.music);
    }

    if (currentSlide > 0) {
      audioManager.playSound("click");
    }
  }, [currentSlide, slides, audioManager]);

  const handleNext = useCallback(() => {
    setCurrentSlide((prev) => {
      if (prev < slides.length - 1) return prev + 1;
      onComplete?.();
      return prev;
    });
  }, [slides.length, onComplete]);

  const handlePrev = useCallback(() => {
    setCurrentSlide((prev) => Math.max(0, prev - 1));
  }, []);

  const handleSlideJump = useCallback(
    (index: number) => {
      setCurrentSlide(index);
      audioManager.playSound("click");
    },
    [audioManager],
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Don't interfere with typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleNext, handlePrev]);

  const currentSlideConfig = slides[currentSlide];
  const SlideComponent = currentSlideConfig.component;
  const slideRef = useSlideAnimation<HTMLDivElement>();

  // Build journey steps for the progress indicator
  const journeySteps = slides.map((slide, index) => ({
    id: slide.id,
    label: slide.title || slide.id,
    icon: JOURNEY_ICONS[index] || "•",
  }));

  return (
    <div className="slide-container" ref={slideRef}>
      {/* Audio controls */}
      <div className="audio-controls">
        <button
          type="button"
          className={`audio-button ${!audioManager.isMusicEnabled ? "disabled" : ""}`}
          onClick={() => audioManager.toggleMusic()}
          title="Toggle Music"
        >
          {audioManager.isMusicEnabled ? "🎵" : "🔇"}
        </button>
        <button
          type="button"
          className={`audio-button ${!audioManager.isSFXEnabled ? "disabled" : ""}`}
          onClick={() => audioManager.toggleSFX()}
          title="Toggle Sound Effects"
        >
          {audioManager.isSFXEnabled ? "🔊" : "🔈"}
        </button>
      </div>

      {/* Journey progress — replaces the old dots */}
      {slides.length > 1 && (
        <div
          style={{
            position: "fixed",
            top: "70px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 10,
            maxWidth: "90vw",
          }}
        >
          <JourneyProgress
            steps={journeySteps}
            currentStep={currentSlide}
            onStepClick={handleSlideJump}
          />
        </div>
      )}

      {/* Slide content */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "calc(100vh - 120px)",
          padding: "40px 20px 100px",
          textAlign: "center",
          maxWidth: "900px",
          margin: "0 auto",
        }}
      >
        <div data-animate>
          <SlideComponent
            onNext={handleNext}
            onPrev={handlePrev}
            slideData={slideData}
          />
        </div>
      </div>

      {/* Navigation */}
      <div
        style={{
          position: "fixed",
          bottom: "24px",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: "12px",
          zIndex: 10,
        }}
      >
        <ShimmerButton
          onClick={handlePrev}
          size="sm"
          disabled={currentSlide === 0}
        >
          ← Previous
        </ShimmerButton>

        <ElectricButton onClick={handleNext} color="violet" size="sm">
          {currentSlide === slides.length - 1 ? "Complete" : "Next →"}
        </ElectricButton>
      </div>
    </div>
  );
};
