import { getAddress, isConnected, signTransaction as signFreighter } from "@stellar/freighter-api";
import albedo from "@albedo-link/intent";

export const WALLET_TYPES = {
  FREIGHTER: "FREIGHTER",
  ALBEDO: "ALBEDO",
  XBULL: "XBULL",
};

export const checkConnection = async () => {
  let freighter = false;
  try {
    freighter = !!window.freighterApi || await isConnected();
  } catch (e) {
    freighter = false;
  }

  const xbull = !!window.xBull;
  return { freighter, xbull };
};

export const connectFreighter = async () => {
  if (!(await isConnected())) {
    throw new Error("Freighter not installed");
  }
  const { address } = await getAddress();
  return { address, type: WALLET_TYPES.FREIGHTER };
};

export const connectAlbedo = async () => {
  const result = await albedo.publicKey({
    token: "Login" // Optional: for backend verification
  });
  return { address: result.pubkey, type: WALLET_TYPES.ALBEDO };
};

export const connectXBull = async () => {
  if (!window.xBull) {
    throw new Error("xBull not installed");
  }
  const address = await window.xBull.getPublicKey();
  return { address, type: WALLET_TYPES.XBULL };
};

export const signTransaction = async (transactionXdr, walletType, networkPassphrase) => {
  try {
    if (walletType === WALLET_TYPES.FREIGHTER) {
      const signed = await signFreighter(transactionXdr, { networkPassphrase });
      return signed;
    } 
    
    if (walletType === WALLET_TYPES.ALBEDO) {
      const res = await albedo.tx({ xdr: transactionXdr, network: 'testnet' }); // Adjust network if needed
      return res.signed_envelope_xdr;
    }

    if (walletType === WALLET_TYPES.XBULL) {
      const signed = await window.xBull.signXdr(transactionXdr);
      return signed;
    }

    throw new Error(`Unsupported wallet type: ${walletType}`);
  } catch (e) {
    console.error("Signing failed:", e);
    throw e;
  }
};