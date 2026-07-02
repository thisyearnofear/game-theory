#![no_std]
#![allow(deprecated)] // env.events().publish() is deprecated in favor of #[contractevent] but works fine
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Bytes, BytesN, Env,
    Symbol, token::Client as TokenClient,
};
use ultrahonk_soroban_verifier::{UltraHonkVerifier, VkLoadError, PROOF_BYTES};

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
    Cancelled,
}

// Event topics
const EVT_GAME_CREATED: Symbol = symbol_short!("CREATED");
const EVT_GAME_JOINED: Symbol = symbol_short!("JOINED");
const EVT_MOVE_REVEALED: Symbol = symbol_short!("REVEALED");
const EVT_GAME_RESOLVED: Symbol = symbol_short!("RESOLVED");
const EVT_GAME_FORFEITED: Symbol = symbol_short!("FORFEIT");
const EVT_GAME_CANCELLED: Symbol = symbol_short!("CANCEL");

#[contracttype]
#[derive(Clone, Debug)]
pub struct Game {
    pub player1: Address,
    pub player2: Option<Address>,
    pub commitment1: Bytes,
    pub commitment2: Option<Bytes>,
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
        // Validate the VK by parsing it before storing
        let _ = UltraHonkVerifier::new(&env, &vk_bytes).map_err(|e| match e {
            VkLoadError::WrongLength => panic!("VK invalid length"),
            VkLoadError::InvalidParameters => panic!("VK invalid parameters"),
        });
        env.storage().instance().set(&VK_KEY, &vk_bytes);
        env.storage().instance().set(&TOKEN_KEY, &xlm_token);
    }

    // ------------------------------------------------------------------------
    // Commit Phase
    // ------------------------------------------------------------------------

    /// Create a new game with a ZK-committed move.
    ///
    /// Player 1 submits commitment (32-byte keccak256 hash) + ZK proof + stake.
    /// The proof is verified on-chain against the commitment and the new game_id,
    /// guaranteeing the commitment is to a valid move (0 or 1) with a known
    /// preimage. The stake is deposited into escrow.
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

        let mut count: u64 = env.storage().instance().get(&GAME_COUNT).unwrap_or(0);
        count += 1;

        Self::verify_proof(&env, &proof, &commitment, count)?;

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

        env.events().publish(
            (EVT_GAME_CREATED, count),
            (player1, stake),
        );

        Ok(count)
    }

    /// Join an existing game with a ZK-committed move.
    ///
    /// Player 2 submits commitment + proof. The proof is verified against the
    /// commitment and the game_id. Stake is deposited into escrow.
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
        if player2 == game.player1 {
            return Err(Error::Unauthorized);
        }
        if game.status != GameStatus::AwaitingPlayer2 {
            return Err(Error::GameAlreadyResolved);
        }

        let now = env.ledger().timestamp();
        if now > game.commit_deadline {
            return Err(Error::GameExpired);
        }

        Self::verify_proof(&env, &proof, &commitment, game_id)?;

        // Deposit stake into contract escrow
        let token_client = Self::get_token_client(&env);
        let contract_address = env.current_contract_address();
        token_client.transfer(&player2, &contract_address, &game.stake);

        let reveal_deadline = now + REVEAL_TIMEOUT;
        game.player2 = Some(player2.clone());
        game.commitment2 = Some(commitment.clone());
        game.status = GameStatus::BothCommitted;
        game.reveal_deadline = reveal_deadline;

        env.storage()
            .persistent()
            .set(&(GAMES, game_id), &game);

        env.events().publish(
            (EVT_GAME_JOINED, game_id),
            (game.player1, player2),
        );

        Ok(())
    }

    // ------------------------------------------------------------------------
    // Reveal Phase
    // ------------------------------------------------------------------------

    /// Reveal a player's move and nonce.
    ///
    /// Verifies keccak256(move || nonce || game_id) matches the stored commitment.
    /// This re-derives the same hash the ZK proof guaranteed at commit time,
    /// confirming the revealed move is the one that was committed.
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
            Self::verify_reveal(&env, &move_, nonce, game_id, &game.commitment1)?;
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
            Self::verify_reveal(&env, &move_, nonce, game_id, &commitment2)?;
            game.move2 = Some(move_);
            game.nonce2 = Some(nonce);
        } else {
            return Err(Error::Unauthorized);
        }

        env.storage()
            .persistent()
            .set(&(GAMES, game_id), &game);

        env.events().publish(
            (EVT_MOVE_REVEALED, game_id),
            player,
        );

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

        env.events().publish(
            (EVT_GAME_RESOLVED, game_id),
            (payout1, payout2),
        );

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
            return Err(Error::GameNotReady);
        }

        let token_client = Self::get_token_client(&env);
        let contract_address = env.current_contract_address();
        let total_stake = game.stake * 2;

        token_client.transfer(&contract_address, &claimant, &total_stake);

        game.status = GameStatus::Forfeited;
        env.storage()
            .persistent()
            .set(&(GAMES, game_id), &game);

        env.events().publish(
            (EVT_GAME_FORFEITED, game_id),
            (claimant, total_stake),
        );

        Ok(())
    }

    /// Cancel a game that no one joined and reclaim the stake.
    ///
    /// Player 1 can call this after the commit deadline passes if no opponent
    /// joined. The full stake is returned. This prevents funds from being
    /// locked forever in games that never start.
    pub fn cancel_game(env: Env, player1: Address, game_id: u64) -> Result<(), Error> {
        player1.require_auth();

        let mut game: Game = env
            .storage()
            .persistent()
            .get(&(GAMES, game_id))
            .ok_or(Error::GameNotFound)?;

        if game.status != GameStatus::AwaitingPlayer2 {
            return Err(Error::GameAlreadyResolved);
        }
        if player1 != game.player1 {
            return Err(Error::Unauthorized);
        }

        let now = env.ledger().timestamp();
        if now <= game.commit_deadline {
            return Err(Error::DeadlineNotPassed);
        }

        let token_client = Self::get_token_client(&env);
        let contract_address = env.current_contract_address();
        token_client.transfer(&contract_address, &player1, &game.stake);

        game.status = GameStatus::Cancelled;
        env.storage()
            .persistent()
            .set(&(GAMES, game_id), &game);

        env.events().publish(
            (EVT_GAME_CANCELLED, game_id),
            player1,
        );

        Ok(())
    }

    /// Claim a refund when both players failed to reveal.
    ///
    /// If the reveal deadline passes and neither player revealed, anyone can
    /// call this to split the escrow equally and return both stakes. This
    /// prevents funds from being locked when both players go offline.
    pub fn claim_refund(env: Env, game_id: u64) -> Result<(), Error> {
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
            return Err(Error::DeadlineNotPassed);
        }

        // If both revealed, the game should have been resolved, not refunded
        if game.move1.is_some() && game.move2.is_some() {
            return Err(Error::BothRevealed);
        }

        let token_client = Self::get_token_client(&env);
        let contract_address = env.current_contract_address();

        // Return each player's stake (no penalty when both failed to reveal)
        token_client.transfer(&contract_address, &game.player1, &game.stake);
        let player2_addr = game.player2.clone().ok_or(Error::GameNotReady)?;
        token_client.transfer(&contract_address, &player2_addr, &game.stake);

        game.status = GameStatus::Cancelled;
        env.storage()
            .persistent()
            .set(&(GAMES, game_id), &game);

        env.events().publish(
            (EVT_GAME_CANCELLED, game_id),
            game_id,
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

    /// Verify an UltraHonk ZK proof against the stored VK.
    ///
    /// The public inputs are constructed from the 32-byte commitment and the
    /// game_id, matching the Noir circuit's public input layout:
    ///   [commitment_high (32B BE), commitment_low (32B BE), game_id (32B BE)]
    ///
    /// The proof guarantees:
    ///   1. The commitment is to a valid move (0 = Cooperate or 1 = Defect)
    ///   2. The player knows the nonce that hashes to this commitment
    ///   3. The commitment is bound to this specific game_id (replay protection)
    fn verify_proof(
        env: &Env,
        proof: &Bytes,
        commitment: &Bytes,
        game_id: u64,
    ) -> Result<(), Error> {
        if commitment.len() != 32 {
            return Err(Error::InvalidPublicInputs);
        }
        if proof.len() as usize != PROOF_BYTES {
            return Err(Error::ProofTooLong);
        }

        let vk_bytes: Bytes = env
            .storage()
            .instance()
            .get(&VK_KEY)
            .ok_or(Error::VKNotInitialized)?;

        let public_inputs = Self::serialize_public_inputs(env, commitment, game_id);

        let verifier = UltraHonkVerifier::new(env, &vk_bytes).map_err(|e| match e {
            VkLoadError::WrongLength => Error::VKNotInitialized,
            VkLoadError::InvalidParameters => Error::VKNotInitialized,
        })?;

        verifier
            .verify(env, proof, &public_inputs)
            .map_err(|_| Error::ProofVerificationFailed)
    }

    /// Serialize the commitment and game_id as Noir public inputs.
    ///
    /// The Noir circuit has 3 public inputs, each serialized as a 32-byte
    /// big-endian Fr element:
    ///   1. commitment_high: first 16 bytes of keccak256 hash as BE u128
    ///   2. commitment_low:  last 16 bytes of keccak256 hash as BE u128
    ///   3. game_id: u64 as BE
    ///
    /// Total: 96 bytes. This must match the circuit's public input order.
    fn serialize_public_inputs(env: &Env, commitment: &Bytes, game_id: u64) -> Bytes {
        let mut public_inputs = Bytes::new(env);

        // commitment_high: 16 zero bytes + first 16 bytes of commitment (BE)
        for _ in 0..16 {
            public_inputs.push_back(0u8);
        }
        let high = commitment.slice(0..16);
        public_inputs.append(&high);

        // commitment_low: 16 zero bytes + last 16 bytes of commitment (BE)
        for _ in 0..16 {
            public_inputs.push_back(0u8);
        }
        let low = commitment.slice(16..32);
        public_inputs.append(&low);

        // game_id: 24 zero bytes + 8 bytes BE
        for _ in 0..24 {
            public_inputs.push_back(0u8);
        }
        for i in (0..8).rev() {
            public_inputs.push_back(((game_id >> (i * 8)) & 0xFF) as u8);
        }

        public_inputs
    }

    /// Verify that revealed move + nonce matches the commitment.
    ///
    /// Computes keccak256(move_byte || nonce_bytes || game_id_bytes) and
    /// compares against the stored commitment. This is the same hash the ZK
    /// proof constrained at commit time, so a valid reveal proves the revealed
    /// move is the one that was committed.
    fn verify_reveal(
        env: &Env,
        move_: &Symbol,
        nonce: u64,
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
        let computed_bytes = Bytes::from_slice(env, &computed_hash.to_array());
        if computed_bytes != *commitment {
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
    fn create_test_env() -> (Env, Address, Address) {
        let env = Env::default();
        env.mock_all_auths();
        env.ledger().set_timestamp(1000);

        // Register a Stellar Asset Contract for testing token transfers
        let admin = Address::generate(&env);
        let xlm_address = env.register_stellar_asset_contract_v2(admin.clone()).address();

        (env, xlm_address, admin)
    }

    /// Fund a player address with XLM tokens from the token admin (issuer).
    fn fund_player(env: &Env, xlm_token: &Address, _admin: &Address, player: &Address, amount: i128) {
        use soroban_sdk::token::StellarAssetClient;
        let sac_client = StellarAssetClient::new(env, xlm_token);
        sac_client.mint(player, &amount);
    }

    /// Load the real VK from the compiled circuit artifacts.
    fn load_real_vk(env: &Env) -> Bytes {
        let vk_bytes = include_bytes!("../../../circuits/move_commitment/target/vk");
        Bytes::from_slice(env, vk_bytes)
    }

    /// Load a real proof and public inputs from the compiled circuit artifacts.
    /// These were generated for: move=0 (Cooperate), nonce=12345, game_id=1.
    fn load_real_proof(env: &Env) -> Bytes {
        let proof_bytes = include_bytes!("../../../circuits/move_commitment/target/proof");
        Bytes::from_slice(env, proof_bytes)
    }

    /// Compute the keccak256 commitment for given move, nonce, game_id.
    fn compute_commitment(env: &Env, move_byte: u8, nonce: u64, game_id: u64) -> Bytes {
        let mut preimage = Bytes::new(env);
        preimage.push_back(move_byte);
        for i in (0..8).rev() {
            preimage.push_back(((nonce >> (i * 8)) & 0xFF) as u8);
        }
        for i in (0..8).rev() {
            preimage.push_back(((game_id >> (i * 8)) & 0xFF) as u8);
        }
        let hash: BytesN<32> = env.crypto().keccak256(&preimage).into();
        Bytes::from_slice(env, &hash.to_array())
    }

    fn deploy_contract(env: &Env, xlm_address: &Address) -> Address {
        let vk_bytes = load_real_vk(env);
        #[allow(deprecated)]
        let contract_id = env.register_contract(None, ZKDilemma);
        let client = ZKDilemmaClient::new(env, &contract_id);
        client.initialize(&vk_bytes, xlm_address);
        contract_id
    }

    #[test]
    fn test_verify_proof_real_proof() {
        let (env, xlm_address, admin) = create_test_env();
        let contract_id = deploy_contract(&env, &xlm_address);

        // The real proof was generated for game_id=1, move=0, nonce=12345
        let proof = load_real_proof(&env);
        let commitment = compute_commitment(&env, 0, 12345, 1);

        let client = ZKDilemmaClient::new(&env, &contract_id);
        let player1 = Address::generate(&env);
        let stake: i128 = 100_000_000;

        // Fund player1 so the escrow transfer succeeds
        fund_player(&env, &xlm_address, &admin, &player1, stake * 2);

        // This should succeed because the proof is real and valid
        let game_id = client.create_game(&player1, &commitment, &proof, &stake);
        assert_eq!(game_id, 1);

        let game = client.get_game(&game_id).unwrap();
        assert_eq!(game.player1, player1);
        assert_eq!(game.status, GameStatus::AwaitingPlayer2);
    }

    #[test]
    fn test_verify_proof_rejects_fake_proof() {
        let (env, xlm_address, admin) = create_test_env();
        let contract_id = deploy_contract(&env, &xlm_address);

        let player1 = Address::generate(&env);
        let commitment = compute_commitment(&env, 0, 12345, 1);

        // A fake proof of the right length (14592 bytes) but invalid content
        let fake_proof = Bytes::from_slice(&env, &[0u8; PROOF_BYTES]);
        let stake: i128 = 100_000_000;

        fund_player(&env, &xlm_address, &admin, &player1, stake * 2);

        let client = ZKDilemmaClient::new(&env, &contract_id);
        let result = client.try_create_game(&player1, &commitment, &fake_proof, &stake);
        assert!(result.is_err());
    }

    #[test]
    fn test_verify_proof_rejects_wrong_length() {
        let (env, xlm_address, _admin) = create_test_env();
        let contract_id = deploy_contract(&env, &xlm_address);

        let player1 = Address::generate(&env);
        let commitment = compute_commitment(&env, 0, 12345, 1);
        let short_proof = Bytes::from_slice(&env, &[0u8; 128]);
        let stake: i128 = 100_000_000;

        let client = ZKDilemmaClient::new(&env, &contract_id);
        let result = client.try_create_game(&player1, &commitment, &short_proof, &stake);
        assert!(result.is_err());
    }

    #[test]
    fn test_create_game_zero_stake_fails() {
        let (env, xlm_address, _admin) = create_test_env();
        let contract_id = deploy_contract(&env, &xlm_address);

        let player1 = Address::generate(&env);
        let commitment = compute_commitment(&env, 0, 12345, 1);
        let proof = load_real_proof(&env);

        let client = ZKDilemmaClient::new(&env, &contract_id);
        let result = client.try_create_game(&player1, &commitment, &proof, &0);
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

    #[test]
    fn test_cancel_game_after_commit_deadline() {
        let (env, xlm_address, admin) = create_test_env();
        let contract_id = deploy_contract(&env, &xlm_address);

        let player1 = Address::generate(&env);
        let commitment = compute_commitment(&env, 0, 12345, 1);
        let proof = load_real_proof(&env);
        let stake: i128 = 100_000_000;

        fund_player(&env, &xlm_address, &admin, &player1, stake * 2);

        let client = ZKDilemmaClient::new(&env, &contract_id);
        let game_id = client.create_game(&player1, &commitment, &proof, &stake);

        // Verify escrow holds the stake
        let contract_balance = env.as_contract(&contract_id, || {
            TokenClient::new(&env, &xlm_address).balance(&contract_id)
        });
        assert_eq!(contract_balance, stake);

        // Advance time past commit deadline (300s)
        env.ledger().set_timestamp(1000 + 301);

        client.cancel_game(&player1, &game_id);

        // Verify stake returned to player1
        let player1_balance = TokenClient::new(&env, &xlm_address).balance(&player1);
        assert_eq!(player1_balance, stake * 2);

        // Verify game status
        let game = client.get_game(&game_id).unwrap();
        assert_eq!(game.status, GameStatus::Cancelled);
    }

    #[test]
    fn test_cancel_game_before_deadline_fails() {
        let (env, xlm_address, admin) = create_test_env();
        let contract_id = deploy_contract(&env, &xlm_address);

        let player1 = Address::generate(&env);
        let commitment = compute_commitment(&env, 0, 12345, 1);
        let proof = load_real_proof(&env);
        let stake: i128 = 100_000_000;

        fund_player(&env, &xlm_address, &admin, &player1, stake * 2);

        let client = ZKDilemmaClient::new(&env, &contract_id);
        let game_id = client.create_game(&player1, &commitment, &proof, &stake);

        // Try to cancel before deadline (should fail)
        let result = client.try_cancel_game(&player1, &game_id);
        assert!(result.is_err());
    }

    #[test]
    fn test_claim_refund_both_timeout() {
        let (env, xlm_address, admin) = create_test_env();
        let contract_id = deploy_contract(&env, &xlm_address);

        let player1 = Address::generate(&env);
        let player2 = Address::generate(&env);
        // Both players use the same commitment (same proof works for both)
        let commitment = compute_commitment(&env, 0, 12345, 1);
        let proof = load_real_proof(&env);
        let stake: i128 = 100_000_000;

        fund_player(&env, &xlm_address, &admin, &player1, stake * 2);
        fund_player(&env, &xlm_address, &admin, &player2, stake * 2);

        let client = ZKDilemmaClient::new(&env, &contract_id);
        let game_id = client.create_game(&player1, &commitment, &proof, &stake);
        client.join_game(&player2, &game_id, &commitment, &proof);

        // Advance time past reveal deadline (300s)
        env.ledger().set_timestamp(1000 + 301 + 301);

        // Neither player revealed — anyone can claim refund
        client.claim_refund(&game_id);

        // Both players get their stake back
        let p1_balance = TokenClient::new(&env, &xlm_address).balance(&player1);
        let p2_balance = TokenClient::new(&env, &xlm_address).balance(&player2);
        assert_eq!(p1_balance, stake * 2);
        assert_eq!(p2_balance, stake * 2);

        let game = client.get_game(&game_id).unwrap();
        assert_eq!(game.status, GameStatus::Cancelled);
    }

    #[test]
    fn test_self_join_prevented() {
        let (env, xlm_address, admin) = create_test_env();
        let contract_id = deploy_contract(&env, &xlm_address);

        let player1 = Address::generate(&env);
        let commitment = compute_commitment(&env, 0, 12345, 1);
        let proof = load_real_proof(&env);
        let stake: i128 = 100_000_000;

        fund_player(&env, &xlm_address, &admin, &player1, stake * 4);

        let client = ZKDilemmaClient::new(&env, &contract_id);
        let game_id = client.create_game(&player1, &commitment, &proof, &stake);

        // Player1 tries to join their own game (should fail)
        let result = client.try_join_game(&player1, &game_id, &commitment, &proof);
        assert!(result.is_err());
    }
}
