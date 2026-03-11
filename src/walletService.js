import { isConnected, requestAccess, signTransaction as signFreighter } from "@stellar/freighter-api";
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
    const connected = await isConnected();
    freighter = connected?.isConnected || connected === true;
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
  try {
    const connected = await isConnected();
    const isFreighterConnected = connected?.isConnected || connected === true;
    
    if (!isFreighterConnected) {
      throw new Error("Freighter is not installed. Please install Freighter extension.");
    }

    const result = await requestAccess();
    
    // ✅ Fix: result object असेल तर .address काढा
    let publicKey;
    if (typeof result === 'string') {
      publicKey = result;
    } else if (result && result.address) {
      publicKey = result.address;
    } else if (result && result.publicKey) {
      publicKey = result.publicKey;
    } else {
      throw new Error("Freighter access denied.");
    }

    if (!publicKey || typeof publicKey !== 'string') {
      throw new Error("Invalid public key from Freighter.");
    }

    return { address: publicKey, type: WALLET_TYPES.FREIGHTER };
  } catch (error) {
    console.error("Freighter connection failed:", error);
    throw new Error(error.message || "Freighter wallet connection failed");
  }
};

export const connectAlbedo = async () => {
  const result = await albedo.publicKey({ token: "Login" });
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
      if (result && result.signedTxXdr) return result.signedTxXdr;
      if (typeof result === "string") return result;
      throw new Error("Freighter signing failed - no XDR returned");
    }

    if (walletType === WALLET_TYPES.ALBEDO) {
      const res = await albedo.tx({
        xdr: transactionXdr,
        network: "testnet",
        submit: false,
      });
      return res.signed_envelope_xdr;
    }

    if (walletType === WALLET_TYPES.XBULL) {
      if (!window.xBullSDK) throw new Error("xBull Wallet is not installed or not active.");
      const signedXdr = await window.xBullSDK.signXDR(transactionXdr, { network: network.toUpperCase() });
      return signedXdr;
    }

    throw new Error(`Unsupported wallet type: ${walletType}`);
  } catch (e) {
    console.error("Signing failed:", e);
    throw e;
  }
};