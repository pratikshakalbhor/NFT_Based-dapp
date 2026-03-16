import { Networks, rpc } from "@stellar/stellar-sdk";

export const NETWORK = "TESTNET";
export const NETWORK_PASSPHRASE = Networks.TESTNET;
export const RPC_URL = "https://soroban-testnet.stellar.org";
export const HORIZON_URL = "https://horizon-testnet.stellar.org";

export const CONTRACT_ID = "CBLKPYQ6TSJB5QVLEZW2XF4UJBJIUATTRDIUMODUIKC3RGBQ4XSGL5U5";
export const ESCROW_CONTRACT_ID = "CD4VIT3HJQKWAWU62PM2QPTWFMNMZKVU2RNRQR3KXFR5XQU6EUKT7MPK";
// Native XLM Stellar Asset Contract (SAC) on testnet — used by true-escrow to lock/release XLM
export const NATIVE_XLM_TOKEN = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

export const SOROBAN_SERVER = new rpc.Server(RPC_URL);