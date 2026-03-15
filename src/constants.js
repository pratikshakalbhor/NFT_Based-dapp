import { Networks, rpc } from "@stellar/stellar-sdk";

export const NETWORK = "TESTNET";
export const NETWORK_PASSPHRASE = Networks.TESTNET;
export const RPC_URL = "https://soroban-testnet.stellar.org";
export const HORIZON_URL = "https://horizon-testnet.stellar.org";

export const CONTRACT_ID ="CCMLYSL4FIEWRBXEIBXUTJ6HF7YMZXY6WB3FE7X42WL4MGBI7XCUER7Q"; 
export const ESCROW_CONTRACT_ID = "CD7CQG3B7ZXQARMS3CJYUNWP62WTK36V72G73TL666YMZRKL7C3B6VZ2";

export const SOROBAN_SERVER = new rpc.Server(RPC_URL);