#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env, Symbol, Vec,
};

mod error;
use error::Error;

// Game moves
const COOPERATE: Symbol = symbol_short!("C");
const DEFECT: Symbol = symbol_short!("D");

// AI Strategies
const RANDOM: Symbol = symbol_short!("RND");
const COOPERATOR: Symbol = symbol_short!("COOP");
const DEFECTOR: Symbol = symbol_short!("DEF");
const TIT_FOR_TAT: Symbol = symbol_short!("TFT");

// Payoff multipliers
const REWARD_MULTIPLIER: i128 = 2;
const TEMPTATION_MULTIPLIER: i128 = 3;
const PUNISHMENT_MULTIPLIER: i128 = 0;

#[contracttype]
#[derive(Clone, Debug)]
pub struct GameResult {
    pub player: Address,
    pub player_move: Symbol,
    pub ai_move: Symbol,
    pub ai_strategy: Symbol,
    pub stake: i128,
    pub player_payout: i128,
    pub ai_payout: i128,
    pub resolved_at: u64,
    pub game_id: u64,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct Game {
    pub id: u64,
    pub player: Address,
    pub player_move: Symbol,
    pub ai_strategy: Symbol,
    pub stake: i128,
    pub status: Symbol, // "pending" or "resolved"
    pub created_at: u64,
}

const GAMES: Symbol = symbol_short!("GAMES");
const GAME_COUNT: Symbol = symbol_short!("COUNT");
const RESULTS: Symbol = symbol_short!("RESULTS");
const PLAYER_RESULTS: Symbol = symbol_short!("PRESULTS");

#[contract]
pub struct SinglePlayerDilemma;

#[contractimpl]
impl SinglePlayerDilemma {
    /// Initialize contract (can be called once)
    pub fn initialize(env: &Env, admin: Address) {
        admin.require_auth();
        let count: u64 = env.storage().instance().get(&GAME_COUNT).unwrap_or(0);
        if count == 0 {
            env.storage().instance().set(&GAME_COUNT, &0u64);
        }
    }

    /// Play a game: create, resolve, and record in one transaction
    /// 
    /// # Arguments
    /// * `player` - Player's address (must authorize)
    /// * `player_move` - "C" (Cooperate) or "D" (Defect)
    /// * `ai_strategy` - "RND", "COOP", "DEF", or "TFT"
    /// * `stake` - Amount in stroops (1 XLM = 10,000,000 stroops)
    pub fn play_game(
        env: &Env,
        player: Address,
        player_move: Symbol,
        ai_strategy: Symbol,
        stake: i128,
    ) -> Result<GameResult, Error> {
        player.require_auth();

        // Validate inputs
        Self::validate_move(&player_move)?;
        Self::validate_strategy(&ai_strategy)?;
        if stake <= 0 {
            return Err(Error::InvalidStake);
        }

        // Get next game ID
        let mut count: u64 = env.storage().instance().get(&GAME_COUNT).unwrap_or(0);
        count += 1;
        env.storage().instance().set(&GAME_COUNT, &count);
        let game_id = count;

        // Generate AI move deterministically based on game_id and strategy
        let ai_move = Self::generate_ai_move(env, game_id, &ai_strategy);

        // Calculate payouts
        let (player_payout, ai_payout) = Self::calculate_payouts(
            &player_move,
            &ai_move,
            stake,
        );

        // Create game record
        let game = Game {
            id: game_id,
            player: player.clone(),
            player_move: player_move.clone(),
            ai_strategy: ai_strategy.clone(),
            stake,
            status: symbol_short!("resolved"),
            created_at: env.ledger().timestamp(),
        };
        env.storage().persistent().set(&(GAMES, game_id), &game);

        // Create result record
        let result = GameResult {
            player: player.clone(),
            player_move: player_move.clone(),
            ai_move: ai_move.clone(),
            ai_strategy: ai_strategy.clone(),
            stake,
            player_payout,
            ai_payout,
            resolved_at: env.ledger().timestamp(),
            game_id,
        };
        env.storage().persistent().set(&(RESULTS, game_id), &result);

        // Store result in player's history (for future leaderboards)
        let mut player_results: Vec<u64> = env
            .storage()
            .persistent()
            .get(&(PLAYER_RESULTS, player.clone()))
            .unwrap_or(Vec::new(&env));
        player_results.push_back(game_id);
        env.storage()
            .persistent()
            .set(&(PLAYER_RESULTS, player.clone()), &player_results);

        Ok(result)
    }

    /// Get game details
    pub fn get_game(env: &Env, game_id: u64) -> Option<Game> {
        env.storage().persistent().get(&(GAMES, game_id))
    }

    /// Get game result
    pub fn get_result(env: &Env, game_id: u64) -> Option<GameResult> {
        env.storage().persistent().get(&(RESULTS, game_id))
    }

    /// Get player's game history (last N games)
    pub fn get_player_history(env: &Env, player: Address, limit: u32) -> Vec<GameResult> {
        let game_ids: Vec<u64> = env
            .storage()
            .persistent()
            .get(&(PLAYER_RESULTS, player))
            .unwrap_or(Vec::new(&env));

        let mut results = Vec::new(&env);
        let len = game_ids.len();
        
        let start = if len > limit {
            len - limit
        } else {
            0
        };

        let mut i = start;
        while i < len {
            if let Some(game_id) = game_ids.get(i) {
                if let Some(result) = env
                    .storage()
                    .persistent()
                    .get::<(Symbol, u64), GameResult>(&(RESULTS, game_id))
                {
                    results.push_back(result);
                }
            }
            i += 1;
        }

        results
    }

    /// Get total games played
    pub fn get_game_count(env: &Env) -> u64 {
        env.storage().instance().get(&GAME_COUNT).unwrap_or(0)
    }

    // ============= Private helpers =============

    fn validate_move(move_: &Symbol) -> Result<(), Error> {
        if move_ == &COOPERATE || move_ == &DEFECT {
            Ok(())
        } else {
            Err(Error::InvalidMove)
        }
    }

    fn validate_strategy(strategy: &Symbol) -> Result<(), Error> {
        match strategy {
            s if s == &RANDOM || s == &COOPERATOR || s == &DEFECTOR || s == &TIT_FOR_TAT => Ok(()),
            _ => Err(Error::InvalidStrategy),
        }
    }

    /// Deterministically generate AI move based on game_id and strategy
    /// This ensures reproducibility and allows verification of moves on-chain
    fn generate_ai_move(env: &Env, game_id: u64, strategy: &Symbol) -> Symbol {
        match strategy {
            s if s == &COOPERATOR => COOPERATE,
            s if s == &DEFECTOR => DEFECT,
            s if s == &TIT_FOR_TAT => {
                // First move cooperates, then would copy opponent (but we only do single round)
                COOPERATE
            }
            _ => {
                // Random: use game_id and ledger sequence as seed for pseudo-randomness
                let seq = env.ledger().sequence();
                let seed = (game_id as u128)
                    .wrapping_mul(seq as u128)
                    .wrapping_mul(31337) as u64;
                if seed % 2 == 0 {
                    COOPERATE
                } else {
                    DEFECT
                }
            }
        }
    }

    fn calculate_payouts(
        player_move: &Symbol,
        ai_move: &Symbol,
        stake: i128,
    ) -> (i128, i128) {
        if player_move == &COOPERATE && ai_move == &COOPERATE {
            (REWARD_MULTIPLIER * stake, REWARD_MULTIPLIER * stake)
        } else if player_move == &COOPERATE && ai_move == &DEFECT {
            (PUNISHMENT_MULTIPLIER * stake, TEMPTATION_MULTIPLIER * stake)
        } else if player_move == &DEFECT && ai_move == &COOPERATE {
            (TEMPTATION_MULTIPLIER * stake, PUNISHMENT_MULTIPLIER * stake)
        } else {
            (PUNISHMENT_MULTIPLIER * stake, PUNISHMENT_MULTIPLIER * stake)
        }
    }


}

#[cfg(all(test, not(target_arch = "wasm32")))]
mod tests {
    use super::*;

    #[test]
    fn test_validate_move() {
        assert!(SinglePlayerDilemma::validate_move(&COOPERATE).is_ok());
        assert!(SinglePlayerDilemma::validate_move(&DEFECT).is_ok());
        assert!(SinglePlayerDilemma::validate_move(&symbol_short!("INVALID")).is_err());
    }

    #[test]
    fn test_validate_strategy() {
        assert!(SinglePlayerDilemma::validate_strategy(&COOPERATOR).is_ok());
        assert!(SinglePlayerDilemma::validate_strategy(&DEFECTOR).is_ok());
        assert!(SinglePlayerDilemma::validate_strategy(&RANDOM).is_ok());
        assert!(SinglePlayerDilemma::validate_strategy(&TIT_FOR_TAT).is_ok());
        assert!(SinglePlayerDilemma::validate_strategy(&symbol_short!("INVALID")).is_err());
    }

    #[test]
    fn test_calculate_payouts_mutual_cooperation() {
        let (p, a) = SinglePlayerDilemma::calculate_payouts(&COOPERATE, &COOPERATE, 100);
        assert_eq!(p, 200);
        assert_eq!(a, 200);
    }

    #[test]
    fn test_calculate_payouts_player_defects() {
        let (p, a) = SinglePlayerDilemma::calculate_payouts(&DEFECT, &COOPERATE, 100);
        assert_eq!(p, 300);
        assert_eq!(a, 0);
    }

    #[test]
    fn test_calculate_payouts_mutual_defection() {
        let (p, a) = SinglePlayerDilemma::calculate_payouts(&DEFECT, &DEFECT, 100);
        assert_eq!(p, 0);
        assert_eq!(a, 0);
    }
}
