#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, Symbol};

mod error;
mod xlm;

use error::Error;

#[contract]
pub struct PrisonersDilemma;

const COOPERATE: Symbol = symbol_short!("C");
const CHEAT: Symbol = symbol_short!("D"); // Defect

// Payoffs: in stroops, assuming stake is 1 XLM = 10^7 stroops
// R: 2, S: 0, T: 3, P: 0 (all in stroops)
const REWARD: i128 = 2 * 10_000_000;
const SUCKER: i128 = 0;
const TEMPTATION: i128 = 3 * 10_000_000;
const PUNISHMENT: i128 = 0;

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
    pub fn __constructor(env: &Env, admin: Address) {
        admin.require_auth();
        xlm::register(env, &admin);
    }

    /// Create a new game
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

        // Transfer stake from player1 to contract
        let xlm_client = xlm::token_client(env);
        xlm_client.transfer(&player1, &env.current_contract_address(), &stake);

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

        // Transfer stake from player2
        let xlm_client = xlm::token_client(env);
        xlm_client.transfer(&player2, &env.current_contract_address(), &game.stake);

        env.storage().persistent().set(&(GAMES, game_id), &game);

        Ok(())
    }

    /// Set move for player1 (after creation, before join)
    pub fn set_move1(env: &Env, player: Address, game_id: u64, move_: Symbol) -> Result<(), Error> {
        player.require_auth();
        let mut game: Game = env.storage().persistent().get(&(GAMES, game_id))
            .ok_or(Error::GameNotFound)?;

        if game.player1 != player || game.move1.is_some() {
            return Err(Error::Unauthorized);
        }

        game.move1 = Some(move_);
        env.storage().persistent().set(&(GAMES, game_id), &game);

        Ok(())
    }

    /// Resolve the game and distribute payouts
    pub fn resolve_game(env: &Env, game_id: u64) -> Result<(), Error> {
        let mut game: Game = env.storage().persistent().get(&(GAMES, game_id))
            .ok_or(Error::GameNotFound)?;

        if game.player2.is_none() || game.move1.is_none() || game.move2.is_none() || game.resolved {
            return Err(Error::GameNotReady);
        }

        let move1 = game.move1.as_ref().unwrap();
        let move2 = game.move2.as_ref().unwrap();

        let (payout1, payout2) = Self::calculate_payoffs(move1.clone(), move2.clone(), game.stake);

        let xlm_client = xlm::token_client(env);
        xlm_client.transfer(&env.current_contract_address(), &game.player1, &payout1);
        if let Some(player2) = &game.player2 {
            xlm_client.transfer(&env.current_contract_address(), player2, &payout2);
        }

        game.resolved = true;
        env.storage().persistent().set(&(GAMES, game_id), &game);

        Ok(())
    }

    fn calculate_payoffs(move1: Symbol, move2: Symbol, _stake: i128) -> (i128, i128) {
        if move1 == CHEAT && move2 == CHEAT {
            (PUNISHMENT, PUNISHMENT)
        } else if move1 == COOPERATE && move2 == CHEAT {
            (SUCKER, TEMPTATION)
        } else if move1 == CHEAT && move2 == COOPERATE {
            (TEMPTATION, SUCKER)
        } else {
            (REWARD, REWARD)
        }
    }

    /// Get game details
    pub fn get_game(env: &Env, game_id: u64) -> Option<Game> {
        env.storage().persistent().get(&(GAMES, game_id))
    }
}
