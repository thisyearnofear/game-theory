#[soroban_sdk::contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    GameNotFound = 1,
    GameAlreadyFull = 2,
    Unauthorized = 3,
    GameNotReady = 4,
}
