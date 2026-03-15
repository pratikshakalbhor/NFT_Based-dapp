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
    let publicKey;
    if (typeof result === "string") {
      publicKey = result;
    } else if (result && result.address) {
      publicKey = result.address;
    } else if (result && result.publicKey) {
      publicKey = result.publicKey;
    } else {
      throw new Error("Freighter access denied.");
    }
    if (!publicKey || typeof publicKey !== "string") {
      throw new Error("Invalid public key from Freighter.");
    }
    return { address: publicKey, type: WALLET_TYPES.FREIGHTER };
  } catch (error) {
    console.error("Freighter connection failed:", error);
    throw new Error(error.message || "Freighter wallet connection failed");
  }
};

export const connectAlbedo = async () => {
  try {
    const res = await albedo.publicKey({ token: "connect_wallet" });
    return { address: res.pubkey, type: WALLET_TYPES.ALBEDO };
  } catch (error) {
    console.error("Albedo connection failed:", error);
    if (error.name === "AlbedoIntentError" && error.code === 4) {
      throw new Error("Albedo connection request was cancelled by the user.");
    }
    throw new Error(
      "Albedo connection failed. Please ensure popups are not blocked and try again."
    );
  }
};

export const connectXBull = async () => {
  if (!window.xBullSDK) {
    throw new Error("xBull Wallet is not installed or not active.");
  }
  const address = await window.xBullSDK.getPublicKey();
  return { address, type: WALLET_TYPES.XBULL };
};

// ─── signTransaction ──────────────────────────────────────────────────────────
// Returns signed XDR string. Caller submits via Soroban RPC — never Horizon.
export const signTransaction = async (transactionXdr, walletType, network, networkPassphrase) => {
  console.log(`[walletService] Signing with ${walletType} | network: ${network}`);

  if (!transactionXdr) throw new Error("No transaction XDR provided to sign.");

  try {
    // ── Freighter ────────────────────────────────────────────────────────────
    if (walletType === WALLET_TYPES.FREIGHTER) {
      const result = await signFreighter(transactionXdr, {
        networkPassphrase: networkPassphrase || "Test SDF Network ; September 2015",
      });
      const signedXdr = typeof result === "string" ? result : result?.signedTxXdr;
      if (!signedXdr) throw new Error("Freighter signing failed — no XDR returned.");
      console.log("[walletService] Freighter signed OK");
      return signedXdr;
    }

    // ── Albedo ───────────────────────────────────────────────────────────────
    if (walletType === WALLET_TYPES.ALBEDO) {
      console.log("[walletService] Calling albedo.tx() — Albedo popup should appear now...");

      // THE KEY FIX:
      // Your constants.js exports NETWORK = "TESTNET" (uppercase).
      // Albedo's tx() requires network to be lowercase "testnet" or "public".
      // Passing "TESTNET" causes albedo.tx() to throw silently before the popup opens.
      const albedoNetwork =
        String(network || "testnet").toLowerCase() === "testnet" ? "testnet" : "public";

      console.log("[walletService] albedo.tx network param:", albedoNetwork);

      const res = await albedo.tx({
        xdr: transactionXdr,
        network: albedoNetwork, // ← must be lowercase "testnet"
        submit: false,          // ← never let Albedo auto-submit (it uses Horizon)
      });

      console.log("[walletService] Albedo raw response:", res);

      if (!res?.signed_envelope_xdr) {
        throw new Error(
          "Albedo did not return signed_envelope_xdr. Response was: " +
            JSON.stringify(res)
        );
      }

      console.log("[walletService] Albedo signed OK — returning signed XDR");
      return res.signed_envelope_xdr;
    }

    // ── xBull ────────────────────────────────────────────────────────────────
    if (walletType === WALLET_TYPES.XBULL) {
      if (!window.xBullSDK) throw new Error("xBull Wallet is not installed or not active.");
      const signedXdr = await window.xBullSDK.signXDR(transactionXdr, {
        network: String(network || "testnet").toUpperCase(),
      });
      return signedXdr;
    }

    throw new Error(`Unsupported wallet type: ${walletType}`);

  } catch (e) {
    console.error("[walletService] Signing error:", e);

    if (e.name === "AlbedoIntentError") {
      if (e.code === 4 || e.code === -2) {
        throw new Error("Transaction signing was cancelled in Albedo.");
      }
      // code 3 means popup was blocked by the browser
      throw new Error(
        `Albedo error (code ${e.code}): ${e.message}. ` +
          "Allow popups for this site in your browser settings."
      );
    }

    throw e; // re-throw all other errors unchanged so MintPage sees the real message
  }
};