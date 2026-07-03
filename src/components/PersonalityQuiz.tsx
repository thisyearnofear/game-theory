/**
 * PersonalityQuiz — an interactive onboarding quiz that builds a "trust profile".
 *
 * Inspired by Duolingo's mascot-guided onboarding and the dating app's
 * personality profile builder. The stick figure mascot guides users
 * through 5 questions, then reveals their trust personality.
 *
 * Flow:
 *   1. Mascot welcomes user
 *   2. 5 interactive questions (visual choices, not text forms)
 *   3. Trust profile reveal (Cooperator / Strategist / Survivor / Wildcard)
 *   4. CTA to start learning
 *
 * The profile is saved to localStorage and can be referenced later
 * in the app (e.g., showing it in the lobby or tutorial).
 *
 * Sound cues play at each step for immersion.
 */
import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { TrustFallCharacter, type CharacterState } from "./TrustFallCharacter";
import { useFirstRun } from "../hooks/useFirstRun";
import AudioManager from "./AudioManager";

const PROFILE_KEY = "tf_trust_profile";

export type TrustProfile =
  | "cooperator"
  | "strategist"
  | "survivor"
  | "wildcard";

interface QuizQuestion {
  id: string;
  prompt: string;
  mascotState: CharacterState;
  options: {
    label: string;
    emoji: string;
    value: "C" | "D" | "neutral";
    profileWeight: Partial<Record<TrustProfile, number>>;
  }[];
}

const QUESTIONS: QuizQuestion[] = [
  {
    id: "first_move",
    prompt: "Someone you just met asks you to trust fall. Do you catch them?",
    mascotState: "waiting",
    options: [
      {
        label: "Of course — I'd catch them",
        emoji: "🤝",
        value: "C",
        profileWeight: { cooperator: 2, strategist: 1 },
      },
      {
        label: "Maybe — depends on their vibe",
        emoji: "🤔",
        value: "neutral",
        profileWeight: { strategist: 2, survivor: 1 },
      },
      {
        label: "I'd step aside — prove yourself first",
        emoji: "⚔️",
        value: "D",
        profileWeight: { survivor: 2, wildcard: 1 },
      },
    ],
  },
  {
    id: "betrayed",
    prompt:
      "You caught someone last time, but they stepped aside when it was your turn. What now?",
    mascotState: "thinking",
    options: [
      {
        label: "Forgive — maybe they had a reason",
        emoji: "🤝",
        value: "C",
        profileWeight: { cooperator: 2, wildcard: 1 },
      },
      {
        label: "Tit for tat — step aside next time",
        emoji: "⚖️",
        value: "neutral",
        profileWeight: { strategist: 3 },
      },
      {
        label: "Never trust them again",
        emoji: "🚫",
        value: "D",
        profileWeight: { survivor: 2, strategist: 1 },
      },
    ],
  },
  {
    id: "stakes",
    prompt:
      "The stakes just went up — real XLM is on the line. How do you feel?",
    mascotState: "standing",
    options: [
      {
        label: "Excited — trust is worth proving",
        emoji: "🤩",
        value: "C",
        profileWeight: { cooperator: 2, wildcard: 1 },
      },
      {
        label: "Cautious — I'll think carefully",
        emoji: "🧐",
        value: "neutral",
        profileWeight: { strategist: 2, survivor: 1 },
      },
      {
        label: "Nervous — I might defect",
        emoji: "😰",
        value: "D",
        profileWeight: { survivor: 2 },
      },
    ],
  },
  {
    id: "repeated",
    prompt: "You'll play 10 rounds with the same person. Your strategy?",
    mascotState: "thinking",
    options: [
      {
        label: "Always cooperate — build trust",
        emoji: "🤝",
        value: "C",
        profileWeight: { cooperator: 3 },
      },
      {
        label: "Start nice, mirror their moves",
        emoji: "🪞",
        value: "neutral",
        profileWeight: { strategist: 3 },
      },
      {
        label: "Mix it up — keep them guessing",
        emoji: "🎲",
        value: "D",
        profileWeight: { wildcard: 3 },
      },
    ],
  },
  {
    id: "noise",
    prompt:
      "There's noise — sometimes moves get flipped by accident. Does this change things?",
    mascotState: "waiting",
    options: [
      {
        label: "Be more forgiving — it might be noise",
        emoji: "🌊",
        value: "C",
        profileWeight: { cooperator: 2, strategist: 1 },
      },
      {
        label: "Account for it — but stay sharp",
        emoji: "📊",
        value: "neutral",
        profileWeight: { strategist: 2, survivor: 1 },
      },
      {
        label: "Assume the worst — defect anyway",
        emoji: "🛡️",
        value: "D",
        profileWeight: { survivor: 2, wildcard: 1 },
      },
    ],
  },
];

const PROFILE_INFO: Record<
  TrustProfile,
  {
    name: string;
    emoji: string;
    description: string;
    color: string;
    state: CharacterState;
  }
> = {
  cooperator: {
    name: "The Cooperator",
    emoji: "🤝",
    description:
      "You lead with trust. You believe cooperation is the best strategy, even when it's risky. The world needs more people like you — but watch out for those who'd take advantage.",
    color: "var(--accent-cooperate)",
    state: "caught",
  },
  strategist: {
    name: "The Strategist",
    emoji: "🧠",
    description:
      "You think before you act. You mirror, you adapt, you play the long game. Tit for tat is your natural rhythm — fair but not naive.",
    color: "var(--accent-violet)",
    state: "thinking",
  },
  survivor: {
    name: "The Survivor",
    emoji: "🛡️",
    description:
      "You protect yourself first. Trust is earned, not given. In a world of betrayal, you'd rather be safe than sorry — and that's a valid choice.",
    color: "var(--accent-defect)",
    state: "standing",
  },
  wildcard: {
    name: "The Wildcard",
    emoji: "🎲",
    description:
      "Unpredictable, adaptive, and a little chaotic. You keep everyone guessing — sometimes you cooperate, sometimes you defect. No one knows what you'll do next.",
    color: "var(--accent-warm)",
    state: "celebrating",
  },
};

export const getStoredProfile = (): TrustProfile | null => {
  try {
    return localStorage.getItem(PROFILE_KEY) as TrustProfile | null;
  } catch {
    return null;
  }
};

const computeProfile = (answers: ("C" | "D" | "neutral")[]): TrustProfile => {
  const weights: Record<TrustProfile, number> = {
    cooperator: 0,
    strategist: 0,
    survivor: 0,
    wildcard: 0,
  };

  answers.forEach((answer, i) => {
    const question = QUESTIONS[i];
    const option = question.options.find((o) => o.value === answer);
    if (option) {
      Object.entries(option.profileWeight).forEach(([profile, weight]) => {
        weights[profile as TrustProfile] += weight;
      });
    }
  });

  // Find the max
  let maxProfile: TrustProfile = "strategist";
  let maxWeight = -1;
  (Object.keys(weights) as TrustProfile[]).forEach((p) => {
    if (weights[p] > maxWeight) {
      maxWeight = weights[p];
      maxProfile = p;
    }
  });

  return maxProfile;
};

export const PersonalityQuiz: React.FC = () => {
  const navigate = useNavigate();
  const { unlock } = useFirstRun();
  const [audioManager] = useState(() => AudioManager.getInstance());
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<("C" | "D" | "neutral")[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [profile, setProfile] = useState<TrustProfile | null>(null);
  const [visible, setVisible] = useState(() => {
    try {
      return localStorage.getItem("tf_quiz_seen") !== "true";
    } catch {
      return true;
    }
  });

  const playSound = useCallback(
    (sound: string) => {
      try {
        audioManager.playSound(sound);
      } catch {
        // ignore
      }
    },
    [audioManager],
  );

  if (!visible) return null;

  const dismiss = () => {
    try {
      localStorage.setItem("tf_quiz_seen", "true");
    } catch {
      // ignore
    }
    setVisible(false);
  };

  const handleAnswer = (value: "C" | "D" | "neutral") => {
    playSound("click");
    const newAnswers = [...answers, value];
    setAnswers(newAnswers);

    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      // Compute profile
      const result = computeProfile(newAnswers);
      setProfile(result);
      setShowResult(true);
      try {
        localStorage.setItem(PROFILE_KEY, result);
      } catch {
        // ignore
      }
      playSound(result === "cooperator" ? "coin" : "defect");
    }
  };

  const handleFinish = () => {
    unlock("visited_learn");
    dismiss();
    void navigate("/learn");
  };

  const currentQuestion = QUESTIONS[step];
  const progress = ((step + 1) / QUESTIONS.length) * 100;

  // Result screen
  if (showResult && profile) {
    const info = PROFILE_INFO[profile];
    return (
      <div
        onClick={dismiss}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.8)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 950,
          padding: "20px",
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "var(--bg-glass)",
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
            border: `1px solid ${info.color}40`,
            borderRadius: "var(--radius-xl)",
            padding: "40px",
            maxWidth: "480px",
            width: "100%",
            textAlign: "center",
            boxShadow: `var(--shadow-lg), 0 0 40px ${info.color}30`,
          }}
        >
          {/* Mascot reveal */}
          <div
            style={{
              marginBottom: "20px",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <TrustFallCharacter
              state={info.state}
              color={
                profile === "cooperator"
                  ? "cooperator"
                  : profile === "survivor"
                    ? "defector"
                    : profile === "wildcard"
                      ? "opponent"
                      : "you"
              }
              size="xl"
              speech={info.emoji}
            />
          </div>

          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-3xl)",
              color: info.color,
              margin: "0 0 16px",
            }}
          >
            {info.name}
          </h2>

          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-base)",
              color: "var(--text-secondary)",
              lineHeight: 1.6,
              margin: "0 0 28px",
            }}
          >
            {info.description}
          </p>

          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-sm)",
              color: "var(--text-muted)",
              margin: "0 0 24px",
            }}
          >
            Now let's see how your strategy plays out against 9 AI opponents...
          </p>

          <div
            style={{ display: "flex", gap: "12px", justifyContent: "center" }}
          >
            <button
              type="button"
              onClick={dismiss}
              style={{
                background: "transparent",
                color: "var(--text-secondary)",
                border: "1px solid var(--border-glass)",
                borderRadius: "var(--radius-sm)",
                padding: "10px 20px",
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-sm)",
                cursor: "pointer",
              }}
            >
              Skip for now
            </button>
            <button
              type="button"
              onClick={handleFinish}
              style={{
                background: info.color,
                color: "white",
                border: "none",
                borderRadius: "var(--radius-sm)",
                padding: "10px 24px",
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-sm)",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: `0 4px 16px ${info.color}40`,
              }}
            >
              Start Learning →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Quiz question screen
  return (
    <div
      onClick={dismiss}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.8)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 950,
        padding: "20px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-glass)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          border: "1px solid var(--border-glass)",
          borderRadius: "var(--radius-xl)",
          padding: "40px",
          maxWidth: "520px",
          width: "100%",
          boxShadow: "var(--shadow-lg), var(--shadow-glow-violet)",
        }}
      >
        {/* Progress bar */}
        <div
          style={{
            height: "4px",
            background: "var(--bg-glass-light)",
            borderRadius: "2px",
            marginBottom: "28px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: "100%",
              background:
                "linear-gradient(90deg, var(--accent-violet), var(--accent-warm))",
              borderRadius: "2px",
              transition: "width 0.4s var(--ease-out)",
            }}
          />
        </div>

        {/* Mascot + question */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div
            style={{
              marginBottom: "16px",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <TrustFallCharacter
              state={currentQuestion.mascotState}
              color="you"
              size="lg"
              speech={`Q${step + 1} of ${QUESTIONS.length}`}
            />
          </div>
          <h3
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-xl)",
              color: "var(--text-primary)",
              margin: "0",
              lineHeight: 1.4,
            }}
          >
            {currentQuestion.prompt}
          </h3>
        </div>

        {/* Answer options */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {currentQuestion.options.map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={() => handleAnswer(option.value)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                padding: "16px 20px",
                borderRadius: "var(--radius-md)",
                background: "var(--bg-glass-light)",
                border: "1px solid var(--border-glass)",
                color: "var(--text-primary)",
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-base)",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.2s var(--ease-out)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(102, 126, 234, 0.1)";
                e.currentTarget.style.borderColor = "var(--accent-violet)";
                e.currentTarget.style.transform = "translateX(4px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--bg-glass-light)";
                e.currentTarget.style.borderColor = "var(--border-glass)";
                e.currentTarget.style.transform = "translateX(0)";
              }}
            >
              <span style={{ fontSize: "24px", flexShrink: 0 }}>
                {option.emoji}
              </span>
              <span>{option.label}</span>
            </button>
          ))}
        </div>

        {/* Skip */}
        <button
          type="button"
          onClick={dismiss}
          style={{
            display: "block",
            margin: "20px auto 0",
            background: "none",
            border: "none",
            color: "var(--text-muted)",
            cursor: "pointer",
            fontSize: "var(--text-xs)",
            fontFamily: "var(--font-body)",
          }}
        >
          Skip quiz
        </button>
      </div>
    </div>
  );
};
