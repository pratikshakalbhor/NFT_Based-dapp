import { Networks, rpc } from "@stellar/stellar-sdk";

export const NETWORK = "TESTNET";
export const NETWORK_PASSPHRASE = Networks.TESTNET;
export const RPC_URL = "https://soroban-testnet.stellar.org";
export const HORIZON_URL = "https://horizon-testnet.stellar.org";
export const CONTRACT_ID = "CDEJPGZHERJIEP44Q5BDM44GJL4NVLXOGH4SNANZJUZODQPU75YF3FUR";

export const SOROBAN_SERVER = new rpc.Server(RPC_URL, { allowHttp: true });