use soroban_sdk::{Address, Env};

pub fn contract_id(env: &Env) -> Address {
    // Use native XLM asset on testnet
    env.current_contract_address()
}

pub fn token_client<'a>(env: &Env) -> soroban_sdk::token::TokenClient<'a> {
    // For testnet, we'll use a different approach - native XLM transfers
    soroban_sdk::token::TokenClient::new(&env, &contract_id(env))
}

const ONE_XLM: i128 = 10_000_000; // 1 XLM in stroops

pub const fn to_stroops(num: u64) -> i128 {
    (num as i128) * ONE_XLM
}
