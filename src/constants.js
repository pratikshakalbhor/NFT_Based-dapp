import { Networks, rpc } from "@stellar/stellar-sdk";

export const NETWORK = "TESTNET";
export const NETWORK_PASSPHRASE = Networks.TESTNET;
export const RPC_URL = "https://soroban-testnet.stellar.org";
export const HORIZON_URL = "https://horizon-testnet.stellar.org";

export const CONTRACT_ID ="CCMLYSL4FIEWRBXEIBXUTJ6HF7YMZXY6WB3FE7X42WL4MGBI7XCUER7Q"; 
export const ESCROW_CONTRACT_ID = "CCOBX32ZBY7ZGN4M2EPNX3BIAVTJFY673HH3RLDAJOQF3XDI3JJPZJTC";

export const SOROBAN_SERVER = new rpc.Server(RPC_URL);