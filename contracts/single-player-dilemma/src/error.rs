use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
pub enum Error {
    // Game state errors
    GameNotFound = 1,
    GameAlreadyResolved = 2,
    InvalidMove = 3,
    InvalidStrategy = 4,
    InvalidStake = 5,

    // Authorization errors
    Unauthorized = 6,
    AuthFailed = 7,

    // Token operation errors
    InsufficientBalance = 8,
    TransferFailed = 9,
    ContractInvokeFailed = 10,

    // Internal errors
    InternalError = 11,
}
