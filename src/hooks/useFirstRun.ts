/**
 * useFirstRun — tracks user milestones across the app.
 *
 * Milestones:
 *   - visited_learn:   user navigated to /learn or /learn/play
 *   - played_tutorial: user completed at least 1 tutorial round
 *   - connected_wallet: user connected a Stellar wallet
 *   - first_zk_game:   user created or joined a ZK game
 *
 * Based on these milestones, we compute a "stage" that the FirstRunWizard
 * and other onboarding UI can use to guide the user.
 */
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "tf_firstrun_milestones";

export type Milestone =
  | "visited_learn"
  | "played_tutorial"
  | "connected_wallet"
  | "first_zk_game";

export type FirstRunStage =
  | "new" // never visited anything
  | "learning" // visited learn, hasn't played tutorial
  | "ready" // played tutorial, hasn't connected wallet
  | "wallet" // connected wallet, hasn't played ZK
  | "complete"; // has done everything

interface MilestoneState {
  visited_learn: boolean;
  played_tutorial: boolean;
  connected_wallet: boolean;
  first_zk_game: boolean;
}

const ALL_FALSE: MilestoneState = {
  visited_learn: false,
  played_tutorial: false,
  connected_wallet: false,
  first_zk_game: false,
};

const loadMilestones = (): MilestoneState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return ALL_FALSE;
    const parsed = JSON.parse(raw) as Partial<MilestoneState>;
    return { ...ALL_FALSE, ...parsed };
  } catch {
    return ALL_FALSE;
  }
};

const saveMilestones = (state: MilestoneState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage errors
  }
};

export const computeStage = (m: MilestoneState): FirstRunStage => {
  if (m.first_zk_game) return "complete";
  if (m.connected_wallet) return "wallet";
  if (m.played_tutorial) return "ready";
  if (m.visited_learn) return "learning";
  return "new";
};

export const useFirstRun = () => {
  const [milestones, setMilestones] = useState<MilestoneState>(loadMilestones);

  // Sync to storage whenever milestones change
  useEffect(() => {
    saveMilestones(milestones);
  }, [milestones]);

  const unlock = useCallback((milestone: Milestone) => {
    setMilestones((prev) => {
      if (prev[milestone]) return prev; // already unlocked
      return { ...prev, [milestone]: true };
    });
  }, []);

  const stage = computeStage(milestones);

  const reset = useCallback(() => {
    setMilestones(ALL_FALSE);
    saveMilestones(ALL_FALSE);
  }, []);

  return {
    milestones,
    stage,
    unlock,
    reset,
    isComplete: stage === "complete",
  };
};
