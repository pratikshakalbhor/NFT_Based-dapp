#![no_std]
use soroban_sdk::{
    contract, contractimpl, symbol_short,
    Address, Env, Symbol, String,
};

const TOTAL: Symbol = symbol_short!("TOTAL");

#[contract]
pub struct NFTContract;

#[contractimpl]
impl NFTContract {
    pub fn mint_nft(
        env: Env,
        minter: Address,
        owner: Address,
        name: String,
        image_url: String,
    ) {
        minter.require_auth();
        let total: u32 = env.storage().instance()
            .get(&TOTAL).unwrap_or(0);
        let nft_id = total + 1;

        env.storage().persistent()
            .set(&(symbol_short!("OWN"), nft_id), &owner);
        env.storage().persistent()
            .set(&(symbol_short!("NAM"), nft_id), &name);
        env.storage().persistent()
            .set(&(symbol_short!("IMG"), nft_id), &image_url);
        env.storage().instance()
            .set(&TOTAL, &nft_id);

        let bal: u32 = env.storage().persistent()
            .get(&(symbol_short!("BAL"), owner.clone()))
            .unwrap_or(0);
        env.storage().persistent()
            .set(&(symbol_short!("BAL"), owner.clone()), &(bal + 1));

        env.events().publish(
            (symbol_short!("MINTED"), nft_id),
            (owner, name),
        );
    }

    pub fn get_total(env: Env) -> u32 {
        env.storage().instance().get(&TOTAL).unwrap_or(0)
    }

    pub fn balance(env: Env, user: Address) -> u32 {
        env.storage().persistent()
            .get(&(symbol_short!("BAL"), user))
            .unwrap_or(0)
    }

    pub fn get_owner(env: Env, id: u32) -> Address {
        env.storage().persistent()
            .get(&(symbol_short!("OWN"), id))
            .unwrap()
    }

    pub fn get_name(env: Env, id: u32) -> String {
        env.storage().persistent()
            .get(&(symbol_short!("NAM"), id))
            .unwrap()
    }

    pub fn get_image(env: Env, id: u32) -> String {
        env.storage().persistent()
            .get(&(symbol_short!("IMG"), id))
            .unwrap()
    }
}