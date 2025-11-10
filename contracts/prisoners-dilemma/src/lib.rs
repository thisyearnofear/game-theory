#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, Symbol};

mod error;

use error::Error;

#[contract]
pub struct PrisonersDilemma;

const COOPERATE: Symbol = symbol_short!("C");
const CHEAT: Symbol = symbol_short!("D"); // Defect

// Payoffs: multipliers of the stake
const REWARD_MULTIPLIER: i128 = 2;
const SUCKER_MULTIPLIER: i128 = 0;
const TEMPTATION_MULTIPLIER: i128 = 3;
const PUNISHMENT_MULTIPLIER: i128 = 0;

#[derive(Clone)]
#[contracttype]
pub struct Game {
    pub player1: Address,
    pub player2: Option<Address>,
    pub move1: Option<Symbol>,
    pub move2: Option<Symbol>,
    pub stake: i128,
    pub resolved: bool,
}

const GAMES: Symbol = symbol_short!("GAMES");
const GAME_COUNT: Symbol = symbol_short!("COUNT");

#[contractimpl]
impl PrisonersDilemma {
    /// Constructor
    pub fn __constructor(_env: &Env, admin: Address) {
        admin.require_auth();
    }

    /// Create a new game (simplified - no XLM transfers during creation)
    pub fn create_game(env: &Env, player1: Address, stake: i128) -> u64 {
        player1.require_auth();
        let mut count: u64 = env.storage().instance().get(&GAME_COUNT).unwrap_or(0);
        count += 1;
        env.storage().instance().set(&GAME_COUNT, &count);

        let game = Game {
            player1: player1.clone(),
            player2: None,
            move1: None,
            move2: None,
            stake,
            resolved: false,
        };
        env.storage().persistent().set(&(GAMES, count), &game);

        count
    }

    /// Join an existing game
    pub fn join_game(env: &Env, player2: Address, game_id: u64, move_: Symbol) -> Result<(), Error> {
        player2.require_auth();
        let mut game: Game = env.storage().persistent().get(&(GAMES, game_id))
            .ok_or(Error::GameNotFound)?;

        if game.player2.is_some() || game.resolved {
            return Err(Error::GameAlreadyFull);
        }

        game.player2 = Some(player2.clone());
        game.move2 = Some(move_);
        env.storage().persistent().set(&(GAMES, game_id), &game);

        Ok(())
    }

    /// Set move for player 1
    pub fn set_move(env: &Env, player: Address, game_id: u64, move_: Symbol) -> Result<(), Error> {
        player.require_auth();
        let mut game: Game = env.storage().persistent().get(&(GAMES, game_id))
            .ok_or(Error::GameNotFound)?;

        if game.resolved {
            return Err(Error::GameAlreadyFull);
        }

        if game.player1 == player {
            game.move1 = Some(move_);
        } else if game.player2.as_ref() == Some(&player) {
            game.move2 = Some(move_);
        } else {
            return Err(Error::Unauthorized);
        }

        env.storage().persistent().set(&(GAMES, game_id), &game);
        Ok(())
    }

    /// Resolve game and calculate payoffs
    pub fn resolve_game(env: &Env, game_id: u64) -> Result<(i128, i128), Error> {
        let mut game: Game = env.storage().persistent().get(&(GAMES, game_id))
            .ok_or(Error::GameNotFound)?;

        if game.resolved {
            return Err(Error::GameAlreadyFull);
        }

        let move1 = game.move1.clone().ok_or(Error::GameNotReady)?;
        let move2 = game.move2.clone().ok_or(Error::GameNotReady)?;

        let (payout1, payout2) = if move1 == COOPERATE && move2 == COOPERATE {
            (REWARD_MULTIPLIER * game.stake, REWARD_MULTIPLIER * game.stake)
        } else if move1 == COOPERATE && move2 == CHEAT {
            (SUCKER_MULTIPLIER * game.stake, TEMPTATION_MULTIPLIER * game.stake)
        } else if move1 == CHEAT && move2 == COOPERATE {
            (TEMPTATION_MULTIPLIER * game.stake, SUCKER_MULTIPLIER * game.stake)
        } else if move1 == CHEAT && move2 == CHEAT {
            (PUNISHMENT_MULTIPLIER * game.stake, PUNISHMENT_MULTIPLIER * game.stake)
        } else {
            return Err(Error::GameNotReady);
        };

        game.resolved = true;
        env.storage().persistent().set(&(GAMES, game_id), &game);

        Ok((payout1, payout2))
    }

    /// Get game details
    pub fn get_game(env: &Env, game_id: u64) -> Option<Game> {
        env.storage().persistent().get(&(GAMES, game_id))
    }
}
