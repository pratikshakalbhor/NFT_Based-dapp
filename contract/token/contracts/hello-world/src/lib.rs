#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    Address, Env, Symbol, String,
};

const SUPPLY: Symbol = symbol_short!("SUPPLY");
const ADMIN: Symbol = symbol_short!("ADMIN");

#[contracttype]
pub enum DataKey {
    Balance(Address),
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct MintEvent {
    pub to: Address,
    pub amount: i128,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct TransferEvent {
    pub from: Address,
    pub to: Address,
    pub amount: i128,
}

#[contract]
pub struct SNFTToken;

#[contractimpl]
impl SNFTToken {
    pub fn initialize(env: Env, admin: Address) {
        admin.require_auth();
        env.storage().instance().set(&ADMIN, &admin);
        env.storage().instance().set(&SUPPLY, &0i128);
    }

    pub fn mint(env: Env, to: Address, amount: i128) {
        let admin: Address = env.storage().instance()
            .get(&ADMIN).unwrap();
        admin.require_auth();

        let bal: i128 = env.storage().persistent()
            .get(&DataKey::Balance(to.clone()))
            .unwrap_or(0);
        env.storage().persistent()
            .set(&DataKey::Balance(to.clone()), &(bal + amount));

        let supply: i128 = env.storage().instance()
            .get(&SUPPLY).unwrap_or(0);
        env.storage().instance()
            .set(&SUPPLY, &(supply + amount));

        env.events().publish(
            (symbol_short!("MINT"),),
            MintEvent { to, amount },
        );
    }

    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        from.require_auth();

        let from_bal: i128 = env.storage().persistent()
            .get(&DataKey::Balance(from.clone()))
            .unwrap_or(0);
        assert!(from_bal >= amount, "Insufficient balance");

        env.storage().persistent()
            .set(&DataKey::Balance(from.clone()), &(from_bal - amount));

        let to_bal: i128 = env.storage().persistent()
            .get(&DataKey::Balance(to.clone()))
            .unwrap_or(0);
        env.storage().persistent()
            .set(&DataKey::Balance(to.clone()), &(to_bal + amount));

        env.events().publish(
            (symbol_short!("XFER"),),
            TransferEvent { from, to, amount },
        );
    }

    pub fn balance(env: Env, account: Address) -> i128 {
        env.storage().persistent()
            .get(&DataKey::Balance(account))
            .unwrap_or(0)
    }

    pub fn total_supply(env: Env) -> i128 {
        env.storage().instance().get(&SUPPLY).unwrap_or(0)
    }

    pub fn name(env: Env) -> String {
        String::from_str(&env, "Stellar NFT Token")
    }

    pub fn symbol(env: Env) -> String {
        String::from_str(&env, "SNFT")
    }

    pub fn decimals(_env: Env) -> u32 {
        7
    }
}
