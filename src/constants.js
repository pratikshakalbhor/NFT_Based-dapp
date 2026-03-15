import { Networks, rpc } from "@stellar/stellar-sdk";

export const NETWORK = "TESTNET";
export const NETWORK_PASSPHRASE = Networks.TESTNET;
export const RPC_URL = "https://soroban-testnet.stellar.org";
export const HORIZON_URL = "https://horizon-testnet.stellar.org";

export const CONTRACT_ID = "CBDU5YGABADUI3VFARIEQVJAAL3LASUNDEO2M2XCWYDTTUH47ENDAYPB";
export const ESCROW_CONTRACT_ID = "CCDPX32SM7NZR7NF6L5LMJE7X46EOE3X7ZGHWAQFGTUIFDXV5GKHV4ZP";
// Native XLM Stellar Asset Contract (SAC) on testnet — used by true-escrow to lock/release XLM
export const NATIVE_XLM_TOKEN = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

export const SOROBAN_SERVER = new rpc.Server(RPC_URL);