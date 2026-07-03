/**
 * MascotContext — the "brain" behind the reactive stick figure mascot.
 *
 * Tracks the mascot's current mood, remembers game history, and generates
 * contextual reactions to events. The mascot has personality that's shaped
 * by the user's trust profile.
 *
 * Any component can call useMascot().react(event) to trigger a reaction,
 * and read mascot.state/speech to render the character appropriately.
 *
 * Reactions are personality-aware:
 *   - Cooperator mascot is warm, encouraging, disappointed by betrayal
 *   - Strategist mascot is analytical, observant, references patterns
 *   - Survivor mascot is cautious, pragmatic, validates self-protection
 *   - Wildcard mascot is playful, unpredictable, makes jokes
 */
import React, {
  createContext,
  use,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import type { CharacterState, CharacterColor } from "./TrustFallCharacter";
import { getStoredProfile, type TrustProfile } from "./PersonalityQuiz";
import AudioManager from "./AudioManager";

export interface MascotReaction {
  state: CharacterState;
  speech: string;
  color?: CharacterColor;
  duration?: number; // ms before returning to idle
  sound?: string;
}

type MascotEvent =
  | "game_won"
  | "game_lost"
  | "game_tied"
  | "betrayed_opponent"
  | "betrayed_by_opponent"
  | "mutual_cooperation"
  | "mutual_defection"
  | "first_game"
  | "wallet_connected"
  | "wallet_funded"
  | "high_stakes"
  | "tutorial_complete"
  | "lobby_idle"
  | "welcome_back"
  | "quiz_complete";

interface MascotContextValue {
  state: CharacterState;
  speech: string | null;
  color: CharacterColor;
  /** Trigger a reaction to an event */
  react: (
    event: MascotEvent,
    context?: { stake?: number; roundsPlayed?: number; wonLast?: boolean },
  ) => void;
  /** Clear the current speech/reaction */
  clear: () => void;
  /** The user's trust profile */
  profile: TrustProfile | null;
  /** Whether the mascot is currently reacting (vs idle) */
  isReacting: boolean;
}

const MascotContext = createContext<MascotContextValue | null>(null);

// Personality-specific reactions
const REACTIONS: Record<
  TrustProfile,
  Partial<Record<MascotEvent, MascotReaction>>
> = {
  cooperator: {
    game_won: {
      state: "celebrating",
      speech: "You caught them! That's what trust looks like.",
      sound: "win",
    },
    game_lost: {
      state: "impact",
      speech: "Ouch... they stepped aside. Not everyone deserves your trust.",
      sound: "lose",
    },
    game_tied: {
      state: "caught",
      speech: "You both showed up. Trust rewarded!",
      sound: "coin",
    },
    betrayed_opponent: {
      state: "thinking",
      speech: "You stepped aside... they trusted you. How does that feel?",
      sound: "defect",
    },
    betrayed_by_opponent: {
      state: "impact",
      speech: "They betrayed you. But don't let one person break your trust.",
      sound: "lose",
    },
    mutual_cooperation: {
      state: "caught",
      speech: "This is it — mutual trust. The best outcome.",
      sound: "coin",
    },
    mutual_defection: {
      state: "impact",
      speech: "Nobody caught anyone. This is what happens without trust.",
      sound: "defect",
    },
    first_game: {
      state: "celebrating",
      speech: "Your first real game! I believe in you.",
      sound: "win",
    },
    wallet_connected: {
      state: "celebrating",
      speech: "Wallet connected! Ready to trust for real.",
      sound: "coin",
    },
    wallet_funded: {
      state: "celebrating",
      speech: "You're funded! Let's catch some people.",
      sound: "coin",
    },
    high_stakes: {
      state: "thinking",
      speech: "That's a big stake. But trust is worth proving, right?",
      sound: "click",
    },
    tutorial_complete: {
      state: "celebrating",
      speech: "You've got the basics! Ready for the real thing?",
      sound: "win",
    },
    lobby_idle: {
      state: "waiting",
      speech: "Waiting for someone to play with...",
    },
    welcome_back: {
      state: "celebrating",
      speech: "You're back! Ready to catch some trust?",
    },
    quiz_complete: {
      state: "celebrating",
      speech: "A Cooperator! The world needs more like you.",
      sound: "coin",
    },
  },
  strategist: {
    game_won: {
      state: "celebrating",
      speech: "Calculated risk paid off. Well played.",
      sound: "win",
    },
    game_lost: {
      state: "thinking",
      speech: "They defected. Note the pattern — adapt next round.",
      sound: "lose",
    },
    game_tied: {
      state: "caught",
      speech: "Mutual cooperation. Optimal outcome achieved.",
      sound: "coin",
    },
    betrayed_opponent: {
      state: "thinking",
      speech: "You exploited their trust. Efficient... but sustainable?",
      sound: "defect",
    },
    betrayed_by_opponent: {
      state: "thinking",
      speech: "They defected. Classic. Time to switch to tit-for-tat.",
      sound: "lose",
    },
    mutual_cooperation: {
      state: "caught",
      speech: "Nash equilibrium reached. Both sides cooperated.",
      sound: "coin",
    },
    mutual_defection: {
      state: "impact",
      speech: "Mutual defection. The worst equilibrium. Avoid this.",
      sound: "defect",
    },
    first_game: {
      state: "thinking",
      speech: "First game. Observe their pattern, then adapt.",
      sound: "click",
    },
    wallet_connected: {
      state: "standing",
      speech: "Wallet ready. Let's analyze some opponents.",
      sound: "click",
    },
    wallet_funded: {
      state: "celebrating",
      speech: "Funded and ready. Time to strategize.",
      sound: "coin",
    },
    high_stakes: {
      state: "thinking",
      speech: "High stake. The expected value still favors cooperation.",
      sound: "click",
    },
    tutorial_complete: {
      state: "celebrating",
      speech: "Theory mastered. Now let's apply it for real.",
      sound: "win",
    },
    lobby_idle: {
      state: "waiting",
      speech: "Scanning for worthy opponents...",
    },
    welcome_back: {
      state: "standing",
      speech: "Back again. Shall we continue the analysis?",
    },
    quiz_complete: {
      state: "thinking",
      speech: "A Strategist! Adaptive, observant, fair. Good combo.",
      sound: "click",
    },
  },
  survivor: {
    game_won: {
      state: "celebrating",
      speech: "You stepped aside. Smart — protect yourself first.",
      sound: "win",
    },
    game_lost: {
      state: "impact",
      speech: "They got you. See? Trust is dangerous.",
      sound: "lose",
    },
    game_tied: {
      state: "caught",
      speech: "You both cooperated. Don't get comfortable.",
      sound: "coin",
    },
    betrayed_opponent: {
      state: "celebrating",
      speech: "You exploited them. Survival of the fittest.",
      sound: "win",
    },
    betrayed_by_opponent: {
      state: "impact",
      speech: "Told you. Never trust anyone completely.",
      sound: "lose",
    },
    mutual_cooperation: {
      state: "caught",
      speech: "Mutual trust... nice while it lasts.",
      sound: "coin",
    },
    mutual_defection: {
      state: "standing",
      speech: "Both defected. Safe, but no reward. That's the cost.",
      sound: "defect",
    },
    first_game: {
      state: "standing",
      speech: "First game. Stay sharp. Don't trust easily.",
      sound: "click",
    },
    wallet_connected: {
      state: "standing",
      speech: "Wallet connected. Guard your XLM carefully.",
      sound: "click",
    },
    wallet_funded: {
      state: "standing",
      speech: "Funded. Now don't lose it all on blind trust.",
      sound: "click",
    },
    high_stakes: {
      state: "thinking",
      speech: "Big stake. More reason to be careful.",
      sound: "click",
    },
    tutorial_complete: {
      state: "celebrating",
      speech: "You know the game now. Stay cautious out there.",
      sound: "win",
    },
    lobby_idle: { state: "waiting", speech: "Waiting... keep your guard up." },
    welcome_back: {
      state: "standing",
      speech: "You survived last time. Let's go again.",
    },
    quiz_complete: {
      state: "standing",
      speech: "A Survivor! Cautious, pragmatic, hard to fool.",
      sound: "click",
    },
  },
  wildcard: {
    game_won: {
      state: "celebrating",
      speech: "Chaos reigns! You won! Or did you? Who cares!",
      sound: "win",
    },
    game_lost: {
      state: "impact",
      speech: "You lost! But was it on purpose? Only you know.",
      sound: "lose",
    },
    game_tied: {
      state: "celebrating",
      speech: "A tie! The most chaotic outcome. Beautiful.",
      sound: "coin",
    },
    betrayed_opponent: {
      state: "celebrating",
      speech: "You betrayed them! Sneaky. I love it.",
      sound: "win",
    },
    betrayed_by_opponent: {
      state: "thinking",
      speech: "They got you. Plot twist! What's your next move?",
      sound: "lose",
    },
    mutual_cooperation: {
      state: "caught",
      speech: "Boring mutual trust. Kidding! It's actually great.",
      sound: "coin",
    },
    mutual_defection: {
      state: "celebrating",
      speech: "Chaos! Both defected! Nobody wins! Perfect!",
      sound: "defect",
    },
    first_game: {
      state: "celebrating",
      speech: "First game! Let's get weird!",
      sound: "win",
    },
    wallet_connected: {
      state: "celebrating",
      speech: "Wallet go brrrr! Let's play!",
      sound: "coin",
    },
    wallet_funded: {
      state: "celebrating",
      speech: "Free money! What could go wrong?",
      sound: "coin",
    },
    high_stakes: {
      state: "celebrating",
      speech: "BIG STAKES! This is gonna be fun!",
      sound: "click",
    },
    tutorial_complete: {
      state: "celebrating",
      speech: "You learned the rules! Now let's break them.",
      sound: "win",
    },
    lobby_idle: {
      state: "waiting",
      speech: "Bored... who wants to play? Anyone? Bueller?",
    },
    welcome_back: {
      state: "celebrating",
      speech: "You're back! Missed you. Let's cause some chaos.",
    },
    quiz_complete: {
      state: "celebrating",
      speech: "A Wildcard! Unpredictable. My favorite kind.",
      sound: "win",
    },
  },
};

// Default reactions for users without a profile
const DEFAULT_REACTIONS: Partial<Record<MascotEvent, MascotReaction>> = {
  game_won: {
    state: "celebrating",
    speech: "You won! Nice catch!",
    sound: "win",
  },
  game_lost: {
    state: "impact",
    speech: "Ouch. They stepped aside.",
    sound: "lose",
  },
  game_tied: {
    state: "caught",
    speech: "Mutual trust! Great outcome.",
    sound: "coin",
  },
  first_game: {
    state: "celebrating",
    speech: "Your first game! Exciting!",
    sound: "win",
  },
  wallet_connected: {
    state: "celebrating",
    speech: "Wallet connected! Ready to play.",
    sound: "coin",
  },
  wallet_funded: {
    state: "celebrating",
    speech: "Funded and ready!",
    sound: "coin",
  },
  high_stakes: {
    state: "thinking",
    speech: "That's a serious stake.",
    sound: "click",
  },
  welcome_back: { state: "celebrating", speech: "Welcome back!" },
  lobby_idle: { state: "waiting", speech: "Waiting for opponents..." },
};

const IDLE_STATE: CharacterState = "standing";
const IDLE_COLOR: CharacterColor = "you";

export const MascotProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const profile = getStoredProfile();
  const [state, setState] = useState<CharacterState>(IDLE_STATE);
  const [speech, setSpeech] = useState<string | null>(null);
  const [color, setColor] = useState<CharacterColor>(IDLE_COLOR);
  const [isReacting, setIsReacting] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [audioManager] = useState(() => AudioManager.getInstance());

  const clear = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setSpeech(null);
    setState(IDLE_STATE);
    setColor(IDLE_COLOR);
    setIsReacting(false);
  }, []);

  const react = useCallback(
    (
      event: MascotEvent,
      _context?: { stake?: number; roundsPlayed?: number; wonLast?: boolean },
    ) => {
      void _context;
      // Clear any previous reaction
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      const reactionSet = profile ? REACTIONS[profile] : DEFAULT_REACTIONS;
      const reaction = reactionSet[event];

      if (!reaction) return;

      setState(reaction.state);
      setSpeech(reaction.speech);
      setColor(reaction.color || IDLE_COLOR);
      setIsReacting(true);

      if (reaction.sound) {
        try {
          audioManager.playSound(reaction.sound);
        } catch {
          // ignore
        }
      }

      // Auto-clear after duration (default 5s, or custom)
      const duration = reaction.duration ?? 5000;
      timeoutRef.current = setTimeout(() => {
        setSpeech(null);
        setState(IDLE_STATE);
        setColor(IDLE_COLOR);
        setIsReacting(false);
      }, duration);
    },
    [profile, audioManager],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <MascotContext
      value={{ state, speech, color, react, clear, profile, isReacting }}
    >
      {children}
    </MascotContext>
  );
};

export const useMascot = (): MascotContextValue => {
  const ctx = use(MascotContext);
  if (!ctx) {
    // Fallback for components outside the provider
    return {
      state: IDLE_STATE,
      speech: null,
      color: IDLE_COLOR,
      react: () => {},
      clear: () => {},
      profile: null,
      isReacting: false,
    };
  }
  return ctx;
};
