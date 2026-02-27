#![no_std]

use soroban_sdk::{contract, contractimpl, symbol_short, Address, Env, Symbol};



// Key for storing the total number of NFTs minted. A single u32 value.
const TOTAL: Symbol = symbol_short!("TOTAL");
// Base key for storing the owner of an NFT. The full key is a tuple
const OWNER: Symbol = symbol_short!("OWNER");
// Base key for storing the name of an NFT. The full key is a tuple
const NAME: Symbol = symbol_short!("NAME");
// Base key for storing the image URL of an NFT. The full key is a tuple
const IMAGE: Symbol = symbol_short!("IMAGE");

#[contract]
pub struct NFTContract;

#[contractimpl]
impl NFTContract {
    /// Mints a new NFT, assigning it to the specified owner.
    
 
    pub fn mint_nft(env: Env, minter: Address, owner: Address, name: Symbol, image_url: Symbol) {
        // Ensure the minter (the one calling the function) has authorized this transaction.
       

        // Get the current total number of NFTs, or 0 if none have been minted.
        let mut total: u32 = Self::get_total(&env);

        // Increment the total to create a new, unique ID for our NFT.
        total += 1;
        let nft_id = total;


        // Store the owner for this NFT ID. Key Value: owner_address
        env.storage()
            .instance()
            .set(&(OWNER, nft_id), &owner);

        // Store the name for this NFT ID. Key: `("NAME", 1)`, Value: `"My First NFT"`
        env.storage()
            .instance()
            .set(&(NAME, nft_id), &name);

        // Store the image URL for this NFT ID. Key
        env.storage()
            .instance()
            .set(&(IMAGE, nft_id), &image_url);

        // Finally, update the total number of NFTs.
        env.storage().instance().set(&TOTAL, &nft_id);

        // Emit an event to notify that a new NFT has been minted.
        // Topics: event_name, nft_id, owner
       env.events().publish(
    (symbol_short!("NFT_MINTED"), nft_id),
    (owner, name)
);
    }

    /// Returns the total number of NFTs minted so far.
    pub fn get_total(env: &Env) -> u32 {
        env.storage().instance().get(&TOTAL).unwrap_or(0)
    }

    /// Returns the owner of the NFT with the given ID.

    pub fn get_owner(env: Env, id: u32) -> Address {
        Self::check_nft_exists(&env, id);
        let key = (OWNER, id);
        env.storage()
            .instance()
            .get(&key)
            .unwrap_or_else(|| panic!("Owner data is missing for NFT #{}", id))
    }

    /// Returns the name of the NFT with the given ID.
   
    pub fn get_name(env: Env, id: u32) -> Symbol {
        Self::check_nft_exists(&env, id);
        let key = (NAME, id);
        env.storage().instance().get(&key).unwrap()
    }

    /// Returns the image URL of the NFT with the given ID.
 
    pub fn get_image(env: Env, id: u32) -> Symbol {
        Self::check_nft_exists(&env, id);
        let key = (IMAGE, id);
        env.storage().instance().get(&key).unwrap()
    }

    /// Helper function to check if an NFT ID is valid.
    fn check_nft_exists(env: &Env, id: u32) {
        let total = Self::get_total(env);
        if id == 0 || id > total {
            panic!("NFT with this ID does not exist");
        }
    }
}
