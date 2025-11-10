import React from "react";
import { SlideSystem } from "../components/SlideSystem";
import { IntroSlide, GameSlide, ConclusionSlide } from "../components/slides";
import "../styles/slides.css";
import "../styles/balloon.css";

const Home: React.FC = () => {
  const slides = [
    {
      id: "intro",
      title: "The Evolution of Trust",
      component: IntroSlide,
      music: "/assets/sounds/background.mp3"
    },
    {
      id: "game",
      title: "Play the Game",
      component: GameSlide,
      music: "/assets/sounds/background.mp3"
    },
    {
      id: "conclusion",
      title: "What We Learned",
      component: ConclusionSlide,
      music: "/assets/sounds/background.mp3"
    }
  ];

  return (
    <div className="slide-container">
      <SlideSystem 
        slides={slides}
        onComplete={() => {
          console.log("Educational slides completed!");
        }}
      />
    </div>
  );
};

export default Home;
