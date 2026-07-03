/**
 * LearnJourney — The guided narrative slide deck
 *
 * The 8-slide interactive journey from Nicky Case's "Evolution of Trust",
 * adapted for Trustfall. This is the "Learn" section — a linear narrative
 * that teaches the game theory concepts, ending with a CTA to play
 * the tutorial sandbox or jump to ZK multiplayer.
 */

import React, { useEffect } from "react";
import { SlideSystem } from "../components/SlideSystem";
import {
  IntroSlide,
  EdgeSlide,
  ChoiceSlide,
  RepeatSlide,
  OpponentsSlide,
  TournamentSlide,
  NoiseSlide,
  RealThingSlide,
} from "../components/slides";
import { useFirstRun } from "../hooks/useFirstRun";
import "../styles/slides.css";
import "../styles/balloon.css";

const LearnJourney: React.FC = () => {
  const { unlock } = useFirstRun();

  useEffect(() => {
    unlock("visited_learn");
  }, [unlock]);

  const slides = [
    {
      id: "intro",
      title: "The Evolution of Trust",
      component: IntroSlide,
      music: "/assets/sounds/background.mp3",
    },
    {
      id: "edge",
      title: "The Edge",
      component: EdgeSlide,
    },
    {
      id: "choice",
      title: "The Choice",
      component: ChoiceSlide,
    },
    {
      id: "repeat",
      title: "The Repeat",
      component: RepeatSlide,
    },
    {
      id: "opponents",
      title: "The Opponents",
      component: OpponentsSlide,
    },
    {
      id: "tournament",
      title: "The Tournament",
      component: TournamentSlide,
    },
    {
      id: "noise",
      title: "The Noise",
      component: NoiseSlide,
    },
    {
      id: "real",
      title: "The Real Thing",
      component: RealThingSlide,
    },
  ];

  return (
    <div className="slide-container">
      <SlideSystem
        slides={slides}
        onComplete={() => {
          // The RealThingSlide handles its own navigation to /play
        }}
      />
    </div>
  );
};

export default LearnJourney;
