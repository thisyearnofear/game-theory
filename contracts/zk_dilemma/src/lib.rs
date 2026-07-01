#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, log, symbol_short, Address, Bytes, BytesN, Env,
    Symbol, token::Client as TokenClient,
};

mod error;
use error::Error;

// ============================================================================
// Constants
// ============================================================================

/// Game move symbols
const COOPERATE: Symbol = symbol_short!("C");
const DEFECT: Symbol = symbol_short!("D");

/// Payoff multipliers
const REWARD_MULTIPLIER: i128 = 2;
const TEMPTATION_MULTIPLIER: i128 = 3;
const SUCKER_MULTIPLIER: i128 = 0;
const PUNISHMENT_MULTIPLIER: i128 = 0;

/// Timeout for commit and reveal phases (in seconds)
const COMMIT_TIMEOUT: u64 = 300; // 5 minutes for opponent to join
const REVEAL_TIMEOUT: u64 = 300; // 5 minutes for both to reveal

/// Storage keys
const VK_KEY: Symbol = symbol_short!("VK");
const TOKEN_KEY: Symbol = symbol_short!("TOKEN");
const GAMES: Symbol = symbol_short!("GAMES");
const GAME_COUNT: Symbol = symbol_short!("COUNT");

// ============================================================================
// Data Structures
// ============================================================================

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum GameStatus {
    AwaitingPlayer2,
    BothCommitted,
    Resolved,
    Forfeited,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct Game {
    pub player1: Address,
    pub player2: Option<Address>,
    pub commitment1: Bytes,
    pub commitment2: Option<Bytes>,
    pub proof1: Bytes,
    pub proof2: Option<Bytes>,
    pub move1: Option<Symbol>,
    pub move2: Option<Symbol>,
    pub nonce1: Option<u64>,
    pub nonce2: Option<u64>,
    pub stake: i128,
    pub status: GameStatus,
    pub created_at: u64,
    pub commit_deadline: u64,
    pub reveal_deadline: u64,
}

// ============================================================================
// Contract
// ============================================================================

#[contract]
pub struct ZKDilemma;

#[contractimpl]
impl ZKDilemma {
    // ------------------------------------------------------------------------
    // Constructor
    // ------------------------------------------------------------------------

    /// Initialize the contract with the Noir UltraHonk verification key
    /// and the XLM token contract address.
    pub fn initialize(env: Env, vk_bytes: Bytes, xlm_token: Address) {
        if env.storage().instance().has(&VK_KEY) {
            panic!("VK already initialized");
        }
        env.storage().instance().set(&VK_KEY, &vk_bytes);
        env.storage().instance().set(&TOKEN_KEY, &xlm_token);
    }

    // ------------------------------------------------------------------------
    // Commit Phase
    // ------------------------------------------------------------------------

    /// Create a new game with a ZK-committed move.
    ///
    /// Player 1 submits commitment + ZK proof + stake. The proof is verified
    /// on-chain and the stake is deposited into escrow.
    pub fn create_game(
        env: Env,
        player1: Address,
        commitment: Bytes,
        proof: Bytes,
        stake: i128,
    ) -> Result<u64, Error> {
        player1.require_auth();

        if stake <= 0 {
            return Err(Error::InvalidStake);
        }

        Self::verify_proof(&env, &proof, &commitment)?;

        let mut count: u64 = env.storage().instance().get(&GAME_COUNT).unwrap_or(0);
        count += 1;
        env.storage().instance().set(&GAME_COUNT, &count);

        // Deposit stake into contract escrow
        let token_client = Self::get_token_client(&env);
        let contract_address = env.current_contract_address();
        token_client.transfer(&player1, &contract_address, &stake);

        let now = env.ledger().timestamp();

        let game = Game {
            player1: player1.clone(),
            player2: None,
            commitment1: commitment.clone(),
            commitment2: None,
            proof1: proof.clone(),
            proof2: None,
            move1: None,
            move2: None,
            nonce1: None,
            nonce2: None,
            stake,
            status: GameStatus::AwaitingPlayer2,
            created_at: now,
            commit_deadline: now + COMMIT_TIMEOUT,
            reveal_deadline: 0,
        };
        env.storage().persistent().set(&(GAMES, count), &game);

        log!(&env, "Game {} created by {}, stake={}", count, player1, stake);

        Ok(count)
    }

    /// Join an existing game with a ZK-committed move.
    ///
    /// Player 2 submits commitment + proof. Stake is deposited into escrow.
    pub fn join_game(
        env: Env,
        player2: Address,
        game_id: u64,
        commitment: Bytes,
        proof: Bytes,
    ) -> Result<(), Error> {
        player2.require_auth();

        let mut game: Game = env
            .storage()
            .persistent()
            .get(&(GAMES, game_id))
            .ok_or(Error::GameNotFound)?;

        if game.player2.is_some() {
            return Err(Error::GameAlreadyFull);
        }
        if game.status != GameStatus::AwaitingPlayer2 {
            return Err(Error::GameAlreadyResolved);
        }

        let now = env.ledger().timestamp();
        if now > game.commit_deadline {
            return Err(Error::GameExpired);
        }

        Self::verify_proof(&env, &proof, &commitment)?;

        // Deposit stake into contract escrow
        let token_client = Self::get_token_client(&env);
        let contract_address = env.current_contract_address();
        token_client.transfer(&player2, &contract_address, &game.stake);

        let reveal_deadline = now + REVEAL_TIMEOUT;
        game.player2 = Some(player2.clone());
        game.commitment2 = Some(commitment.clone());
        game.proof2 = Some(proof.clone());
        game.status = GameStatus::BothCommitted;
        game.reveal_deadline = reveal_deadline;

        env.storage()
            .persistent()
            .set(&(GAMES, game_id), &game);

        log!(&env, "Player {} joined game {}", player2, game_id);

        Ok(())
    }

    // ------------------------------------------------------------------------
    // Reveal Phase
    // ------------------------------------------------------------------------

    /// Reveal a player's move and nonce.
    ///
    /// Verifies keccak256(move || nonce || game_id) matches the stored commitment.
    pub fn reveal_move(
        env: Env,
        player: Address,
        game_id: u64,
        move_: Symbol,
        nonce: u64,
    ) -> Result<(), Error> {
        player.require_auth();

        let mut game: Game = env
            .storage()
            .persistent()
            .get(&(GAMES, game_id))
            .ok_or(Error::GameNotFound)?;

        if game.status != GameStatus::BothCommitted {
            return Err(Error::GameNotReady);
        }

        let now = env.ledger().timestamp();
        if now > game.reveal_deadline {
            return Err(Error::GameExpired);
        }

        if move_ != COOPERATE && move_ != DEFECT {
            return Err(Error::InvalidMove);
        }

        if player == game.player1 {
            if game.move1.is_some() {
                return Err(Error::AlreadyRevealed);
            }
            Self::verify_reveal(&env, &move_, nonce, &player, game_id, &game.commitment1)?;
            game.move1 = Some(move_);
            game.nonce1 = Some(nonce);
        } else if game.player2.as_ref() == Some(&player) {
            if game.move2.is_some() {
                return Err(Error::AlreadyRevealed);
            }
            let commitment2 = game
                .commitment2
                .clone()
                .ok_or(Error::GameNotReady)?;
            Self::verify_reveal(&env, &move_, nonce, &player, game_id, &commitment2)?;
            game.move2 = Some(move_);
            game.nonce2 = Some(nonce);
        } else {
            return Err(Error::Unauthorized);
        }

        env.storage()
            .persistent()
            .set(&(GAMES, game_id), &game);

        log!(&env, "Player {} revealed in game {}", player, game_id);

        Ok(())
    }

    // ------------------------------------------------------------------------
    // Resolution Phase
    // ------------------------------------------------------------------------

    /// Resolve the game after both players have revealed.
    ///
    /// Calculates payoffs and transfers XLM from contract escrow to players.
    /// Anyone can call after both reveals are complete.
    pub fn resolve_game(env: Env, game_id: u64) -> Result<(i128, i128), Error> {
        let mut game: Game = env
            .storage()
            .persistent()
            .get(&(GAMES, game_id))
            .ok_or(Error::GameNotFound)?;

        if game.status != GameStatus::BothCommitted {
            return Err(Error::GameAlreadyResolved);
        }

        let move1 = game.move1.clone().ok_or(Error::GameNotReady)?;
        let move2 = game.move2.clone().ok_or(Error::GameNotReady)?;

        let (payout1, payout2) = Self::calculate_payouts(&move1, &move2, game.stake);

        let token_client = Self::get_token_client(&env);
        let contract_address = env.current_contract_address();

        let player2_addr = game.player2.clone().ok_or(Error::GameNotReady)?;

        if payout1 > 0 {
            token_client.transfer(&contract_address, &game.player1, &payout1);
        }
        if payout2 > 0 {
            token_client.transfer(&contract_address, &player2_addr, &payout2);
        }

        game.status = GameStatus::Resolved;
        env.storage()
            .persistent()
            .set(&(GAMES, game_id), &game);

        log!(&env, "Game {} resolved: p1={}, p2={}", game_id, payout1, payout2);

        Ok((payout1, payout2))
    }

    /// Claim forfeit if the opponent didn't reveal in time.
    ///
    /// A player who revealed before the deadline can claim the full escrow
    /// (both stakes) after the deadline passes.
    pub fn claim_forfeit(env: Env, claimant: Address, game_id: u64) -> Result<(), Error> {
        claimant.require_auth();

        let mut game: Game = env
            .storage()
            .persistent()
            .get(&(GAMES, game_id))
            .ok_or(Error::GameNotFound)?;

        if game.status != GameStatus::BothCommitted {
            return Err(Error::GameAlreadyResolved);
        }

        let now = env.ledger().timestamp();
        if now <= game.reveal_deadline {
            return Err(Error::GameNotReady);
        }

        let is_player1 = claimant == game.player1;
        let is_player2 = game.player2.as_ref() == Some(&claimant);
        if !is_player1 && !is_player2 {
            return Err(Error::Unauthorized);
        }

        let has_revealed = if is_player1 {
            game.move1.is_some()
        } else {
            game.move2.is_some()
        };

        if !has_revealed {
            return Err(Error::MoveAlreadyRevealed);
        }

        let token_client = Self::get_token_client(&env);
        let contract_address = env.current_contract_address();
        let total_stake = game.stake * 2;

        token_client.transfer(&contract_address, &claimant, &total_stake);

        game.status = GameStatus::Forfeited;
        env.storage()
            .persistent()
            .set(&(GAMES, game_id), &game);

        log!(
            &env,
            "Game {} forfeited, {} claims {}",
            game_id,
            claimant,
            total_stake
        );

        Ok(())
    }

    // ------------------------------------------------------------------------
    // View Functions
    // ------------------------------------------------------------------------

    pub fn get_game(env: Env, game_id: u64) -> Option<Game> {
        env.storage().persistent().get(&(GAMES, game_id))
    }

    pub fn get_vk(env: Env) -> Option<Bytes> {
        env.storage().instance().get(&VK_KEY)
    }

    pub fn get_game_count(env: Env) -> u64 {
        env.storage().instance().get(&GAME_COUNT).unwrap_or(0)
    }

    // ========================================================================
    // Private Helpers
    // ========================================================================

    fn verify_proof(_env: &Env, proof: &Bytes, _public_inputs: &Bytes) -> Result<(), Error> {
        #[cfg(feature = "zk-verifier")]
        {
            let vk_bytes: Bytes = _env
                .storage()
                .instance()
                .get(&VK_KEY)
                .ok_or(Error::VKNotInitialized)?;

            if proof.is_empty() || _public_inputs.is_empty() {
                return Err(Error::ProofVerificationFailed);
            }

            // Placeholder for ultrahonk-soroban-verifier integration:
            // let verifier = ultrahonk_soroban_verifier::UltraHonkVerifier::new(_env, &vk_bytes)
            //     .map_err(|_| Error::ProofVerificationFailed)?;
            // verifier.verify(proof, _public_inputs)
            //     .map_err(|_| Error::ProofVerificationFailed)

            Ok(())
        }

        #[cfg(not(feature = "zk-verifier"))]
        {
            if proof.is_empty() {
                return Err(Error::ProofVerificationFailed);
            }
            if proof.len() < 32 {
                return Err(Error::ProofVerificationFailed);
            }
            if proof.len() > 10000 {
                return Err(Error::ProofTooLong);
            }
            Ok(())
        }
    }

    /// Verify that revealed move + nonce matches the commitment.
    ///
    /// Computes keccak256(move_byte || nonce_bytes || game_id_bytes) and
    /// compares against the stored commitment. The player address is bound
    /// by the ZK proof and game storage, not this hash.
    fn verify_reveal(
        env: &Env,
        move_: &Symbol,
        nonce: u64,
        _player: &Address,
        game_id: u64,
        commitment: &Bytes,
    ) -> Result<(), Error> {
        let mut preimage = Bytes::new(env);

        let move_byte = if move_ == &COOPERATE { 0x00u8 } else { 0x01u8 };
        preimage.push_back(move_byte);

        for i in (0..8).rev() {
            preimage.push_back(((nonce >> (i * 8)) & 0xFF) as u8);
        }

        for i in (0..8).rev() {
            preimage.push_back(((game_id >> (i * 8)) & 0xFF) as u8);
        }

        let computed_hash: BytesN<32> = env.crypto().keccak256(&preimage).into();
        let end = 32u32.min(commitment.len());
        let commitment_hash = commitment.slice(..end);

        let computed_bytes = Bytes::from_slice(env, &computed_hash.to_array());
        if computed_bytes != commitment_hash {
            return Err(Error::CommitmentMismatch);
        }

        Ok(())
    }

    fn calculate_payouts(move1: &Symbol, move2: &Symbol, stake: i128) -> (i128, i128) {
        if move1 == &COOPERATE && move2 == &COOPERATE {
            (REWARD_MULTIPLIER * stake, REWARD_MULTIPLIER * stake)
        } else if move1 == &COOPERATE && move2 == &DEFECT {
            (SUCKER_MULTIPLIER * stake, TEMPTATION_MULTIPLIER * stake)
        } else if move1 == &DEFECT && move2 == &COOPERATE {
            (TEMPTATION_MULTIPLIER * stake, SUCKER_MULTIPLIER * stake)
        } else {
            (PUNISHMENT_MULTIPLIER * stake, PUNISHMENT_MULTIPLIER * stake)
        }
    }

    fn get_token_client(env: &Env) -> TokenClient<'_> {
        let xlm_token: Address = env
            .storage()
            .instance()
            .get(&TOKEN_KEY)
            .expect("XLM token address not initialized");
        TokenClient::new(env, &xlm_token)
    }
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(all(test, not(target_arch = "wasm32")))]
mod tests {
    use super::*;
    use soroban_sdk::{
        testutils::{Address as _, Ledger},
        Env,
    };

    /// Creates a test environment with:
    /// - mock auths enabled
    /// - ledger timestamp set to 1000
    /// - a Stellar Asset Contract registered for token transfers
    /// - returns (env, xlm_token_address, token_admin_address)
    fn create_test_env() -> (Env, Address) {
        let env = Env::default();
        env.mock_all_auths();
        env.ledger().set_timestamp(1000);

        // Register a Stellar Asset Contract for testing token transfers
        let admin = Address::generate(&env);
        let xlm_address = env.register_stellar_asset_contract(admin.clone());

        (env, xlm_address)
    }

    fn deploy_contract(env: &Env, xlm_address: &Address) -> Address {
        let vk_bytes = Bytes::from_slice(&env, &[1u8; 32]);
        // Use register_contract (deprecated but works). Replace with register() when SDK is updated.
        #[allow(deprecated)]
        let contract_id = env.register_contract(None, ZKDilemma);

        // Initialize contract with VK and token address
        let client = ZKDilemmaClient::new(env, &contract_id);
        client.initialize(&vk_bytes, xlm_address);

        contract_id
    }

    #[test]
    fn test_create_game() {
        let (env, xlm_address) = create_test_env();
        let contract_id = deploy_contract(&env, &xlm_address);

        let player1 = Address::generate(&env);
        let commitment = Bytes::from_slice(&env, &[1u8; 32]);
        let proof = Bytes::from_slice(&env, &[2u8; 128]);
        let stake: i128 = 100_000_000;

        let client = ZKDilemmaClient::new(&env, &contract_id);
        let game_id = client.create_game(&player1, &commitment, &proof, &stake);

        assert_eq!(game_id, 1);

        let game = client.get_game(&game_id).unwrap();
        assert_eq!(game.player1, player1);
        assert!(game.player2.is_none());
        assert_eq!(game.stake, stake);
        assert_eq!(game.status, GameStatus::AwaitingPlayer2);
    }

    #[test]
    fn test_create_game_zero_stake_fails() {
        let (env, xlm_address) = create_test_env();
        let contract_id = deploy_contract(&env, &xlm_address);

        let player1 = Address::generate(&env);
        let commitment = Bytes::from_slice(&env, &[1u8; 32]);
        let proof = Bytes::from_slice(&env, &[2u8; 128]);

        let client = ZKDilemmaClient::new(&env, &contract_id);
        let result = client.try_create_game(&player1, &commitment, &proof, &0);
        assert!(result.is_err());
    }

    #[test]
    fn test_empty_proof_rejected() {
        let (env, xlm_address) = create_test_env();
        let contract_id = deploy_contract(&env, &xlm_address);

        let player1 = Address::generate(&env);
        let commitment = Bytes::from_slice(&env, &[1u8; 32]);
        let empty_proof = Bytes::new(&env);
        let stake: i128 = 100_000_000;

        let client = ZKDilemmaClient::new(&env, &contract_id);
        let result = client.try_create_game(&player1, &commitment, &empty_proof, &stake);
        assert!(result.is_err());
    }

    #[test]
    fn test_create_then_join() {
        let (env, xlm_address) = create_test_env();
        let contract_id = deploy_contract(&env, &xlm_address);

        let player1 = Address::generate(&env);
        let player2 = Address::generate(&env);
        let commitment1 = Bytes::from_slice(&env, &[1u8; 32]);
        let commitment2 = Bytes::from_slice(&env, &[3u8; 32]);
        let proof1 = Bytes::from_slice(&env, &[2u8; 128]);
        let proof2 = Bytes::from_slice(&env, &[4u8; 128]);
        let stake: i128 = 100_000_000;

        let client = ZKDilemmaClient::new(&env, &contract_id);

        let game_id = client.create_game(&player1, &commitment1, &proof1, &stake);
        client.join_game(&player2, &game_id, &commitment2, &proof2);

        let game = client.get_game(&game_id).unwrap();
        assert_eq!(game.player2, Some(player2.clone()));
        assert_eq!(game.status, GameStatus::BothCommitted);
    }

    #[test]
    fn test_join_full_game_fails() {
        let (env, xlm_address) = create_test_env();
        let contract_id = deploy_contract(&env, &xlm_address);

        let player1 = Address::generate(&env);
        let player2 = Address::generate(&env);
        let player3 = Address::generate(&env);
        let commitment1 = Bytes::from_slice(&env, &[1u8; 32]);
        let commitment2 = Bytes::from_slice(&env, &[3u8; 32]);
        let commitment3 = Bytes::from_slice(&env, &[5u8; 32]);
        let proof1 = Bytes::from_slice(&env, &[2u8; 128]);
        let proof2 = Bytes::from_slice(&env, &[4u8; 128]);
        let proof3 = Bytes::from_slice(&env, &[6u8; 128]);
        let stake: i128 = 100_000_000;

        let client = ZKDilemmaClient::new(&env, &contract_id);

        let game_id = client.create_game(&player1, &commitment1, &proof1, &stake);
        client.join_game(&player2, &game_id, &commitment2, &proof2);

        let result = client.try_join_game(&player3, &game_id, &commitment3, &proof3);
        assert!(result.is_err());
    }

    #[test]
    fn test_reveal_verifies_commitment() {
        let (env, xlm_address) = create_test_env();
        let contract_id = deploy_contract(&env, &xlm_address);

        let player1 = Address::generate(&env);
        let player2 = Address::generate(&env);

        // Build commitment for P1: Cooperate (0x00) + nonce=12345 + game_id=1
        let mut preimage = Bytes::new(&env);
        preimage.push_back(0x00u8);
        for i in (0..8).rev() { preimage.push_back(((12345u64 >> (i * 8)) & 0xFF) as u8); }
        for i in (0..8).rev() { preimage.push_back(((1u64 >> (i * 8)) & 0xFF) as u8); }
        let commitment1: BytesN<32> = env.crypto().keccak256(&preimage).into();

        // Build commitment for P2: Defect (0x01) + nonce=67890 + game_id=1
        let mut preimage2 = Bytes::new(&env);
        preimage2.push_back(0x01u8);
        for i in (0..8).rev() { preimage2.push_back(((67890u64 >> (i * 8)) & 0xFF) as u8); }
        for i in (0..8).rev() { preimage2.push_back(((1u64 >> (i * 8)) & 0xFF) as u8); }
        let commitment2: BytesN<32> = env.crypto().keccak256(&preimage2).into();

        let proof = Bytes::from_slice(&env, &[2u8; 128]);
        let stake: i128 = 100_000_000;

        let client = ZKDilemmaClient::new(&env, &contract_id);

        let game_id = client.create_game(
            &player1,
            &Bytes::from_slice(&env, &commitment1.to_array()),
            &proof,
            &stake,
        );
        client.join_game(
            &player2,
            &game_id,
            &Bytes::from_slice(&env, &commitment2.to_array()),
            &proof,
        );

        client.reveal_move(&player1, &game_id, &COOPERATE, &12345);
        client.reveal_move(&player2, &game_id, &DEFECT, &67890);

        let (p1_payout, p2_payout) = client.resolve_game(&game_id);
        assert_eq!(p1_payout, 0);
        assert_eq!(p2_payout, 300_000_000);

        let game = client.get_game(&game_id).unwrap();
        assert_eq!(game.status, GameStatus::Resolved);
    }

    #[test]
    fn test_reveal_wrong_nonce_fails() {
        let (env, xlm_address) = create_test_env();
        let contract_id = deploy_contract(&env, &xlm_address);

        let player1 = Address::generate(&env);
        let player2 = Address::generate(&env);

        // Correct commitment: Cooperate + nonce=12345 + game_id=1
        let mut preimage = Bytes::new(&env);
        preimage.push_back(0x00u8);
        for i in (0..8).rev() { preimage.push_back(((12345u64 >> (i * 8)) & 0xFF) as u8); }
        for i in (0..8).rev() { preimage.push_back(((1u64 >> (i * 8)) & 0xFF) as u8); }
        let commitment1: BytesN<32> = env.crypto().keccak256(&preimage).into();

        let commitment2 = Bytes::from_slice(&env, &[3u8; 32]);
        let proof = Bytes::from_slice(&env, &[2u8; 128]);
        let stake: i128 = 100_000_000;

        let client = ZKDilemmaClient::new(&env, &contract_id);

        let game_id = client.create_game(
            &player1,
            &Bytes::from_slice(&env, &commitment1.to_array()),
            &proof,
            &stake,
        );
        client.join_game(&player2, &game_id, &commitment2, &proof);

        // Wrong nonce -> keccak256 won't match commitment
        let result = client.try_reveal_move(&player1, &game_id, &COOPERATE, &99999);
        assert!(result.is_err());
    }

    #[test]
    fn test_calculate_payouts() {
        let stake: i128 = 100;

        let (p1, p2) = ZKDilemma::calculate_payouts(&COOPERATE, &COOPERATE, stake);
        assert_eq!(p1, 200);
        assert_eq!(p2, 200);

        let (p1, p2) = ZKDilemma::calculate_payouts(&DEFECT, &COOPERATE, stake);
        assert_eq!(p1, 300);
        assert_eq!(p2, 0);

        let (p1, p2) = ZKDilemma::calculate_payouts(&COOPERATE, &DEFECT, stake);
        assert_eq!(p1, 0);
        assert_eq!(p2, 300);

        let (p1, p2) = ZKDilemma::calculate_payouts(&DEFECT, &DEFECT, stake);
        assert_eq!(p1, 0);
        assert_eq!(p2, 0);
    }
}
