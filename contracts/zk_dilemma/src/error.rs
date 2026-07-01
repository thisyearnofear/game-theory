use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    // Game state errors
    GameNotFound = 1,
    GameAlreadyFull = 2,
    GameAlreadyJoined = 3,
    GameAlreadyResolved = 4,
    GameNotReady = 5,
    GameExpired = 6,
    NotYourGame = 7,
    MoveAlreadyRevealed = 8,
    InvalidMove = 9,
    InvalidStake = 10,
    CommitmentMismatch = 11,

    // ZK errors
    ProofVerificationFailed = 12,
    ProofTooLong = 13,
    InvalidPublicInputs = 14,
    VKNotInitialized = 15,

    // Authorization errors
    Unauthorized = 16,
    AlreadyRevealed = 17,
    NotYourTurn = 18,

    // Token operation errors
    InsufficientBalance = 19,
    TransferFailed = 20,
    TokenClientError = 21,
}
