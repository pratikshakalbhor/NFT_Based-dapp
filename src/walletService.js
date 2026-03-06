import { getAddress, isConnected, signTransaction as signFreighter } from "@stellar/freighter-api";
import albedo from "@albedo-link/intent";

export const WALLET_TYPES = {
  FREIGHTER: "FREIGHTER",
  ALBEDO: "ALBEDO",
  XBULL: "XBULL",
};

export const checkConnection = async () => {
  let freighter = false;
  let xbull = false;
  try {
    freighter = !!window.freighterApi || await isConnected();
  } catch (e) {
    freighter = false;
  }
  try {
    xbull = !!window.xBullSDK;
  } catch (e) {
    xbull = false;
  }
  return { freighter, xbull };
};

export const connectFreighter = async () => {
  if (!(await isConnected())) {
    throw new Error("Freighter is not installed or not active.");
  }
  const { address } = await getAddress();
  return { address, type: WALLET_TYPES.FREIGHTER };
};

export const connectAlbedo = async () => {
  const result = await albedo.publicKey({
    token: "Login"
  });
  return { address: result.pubkey, type: WALLET_TYPES.ALBEDO };
};

export const connectXBull = async () => {
  if (!window.xBullSDK) {
    throw new Error("xBull Wallet is not installed or not active.");
  }
  const address = await window.xBullSDK.getPublicKey();
  return { address, type: WALLET_TYPES.XBULL };
};

export const signTransaction = async (transactionXdr, walletType, network, networkPassphrase) => {
  try {
    if (walletType === WALLET_TYPES.FREIGHTER) {
    
      const result = await signFreighter(transactionXdr, {
        networkPassphrase: "Test SDF Network ; September 2015",
      });

      console.log("Freighter sign result:", result);

      // Freighter v2+ returns object with signedTxXdr
      if (result && result.signedTxXdr) {
        return result.signedTxXdr;
      }
      // Older Freighter returns string directly
      if (typeof result === "string") {
        return result;
      }
      throw new Error("Freighter signing failed - no XDR returned");
    }

    if (walletType === WALLET_TYPES.ALBEDO) {
     
      const res = await albedo.tx({
        xdr: transactionXdr,
        network: "testnet",
        submit: false,
      });
      console.log("Albedo sign result:", res);
      return res.signed_envelope_xdr;
    }

    if (walletType === WALLET_TYPES.XBULL) {
      if (!window.xBullSDK) {
        throw new Error("xBull Wallet is not installed or not active.");
      }
      const signedXdr = await window.xBullSDK.signXDR(transactionXdr, { network: network.toUpperCase() });
      console.log("xBull sign result:", signedXdr);
      return signedXdr;
    }

    throw new Error(`Unsupported wallet type: ${walletType}`);
  } catch (e) {
    console.error("Signing failed:", e);
    throw e;
  }
};