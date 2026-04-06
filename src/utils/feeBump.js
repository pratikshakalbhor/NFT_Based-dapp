import * as StellarSdk from "@stellar/stellar-sdk";
import { NETWORK_PASSPHRASE, SOROBAN_SERVER } from "../constants";

const HORIZON_URL = "https://horizon-testnet.stellar.org";

/**
 * Fee Bump Transaction — Sponsor pays the fee
 * User signs the inner transaction
 * Sponsor wraps it with fee bump
 */
export const submitWithFeeBump = async (
  innerSignedXdr,   // XDR string — signed by user
  sponsorSecret     // Sponsor's secret key
) => {
  try {
    const sponsorKeypair = StellarSdk.Keypair.fromSecret(sponsorSecret);
    const horizonServer = new StellarSdk.Horizon.Server(HORIZON_URL);

    // Parse inner transaction
    const innerTx = StellarSdk.TransactionBuilder.fromXDR(
      innerSignedXdr,
      NETWORK_PASSPHRASE
    );

    // Build fee bump wrapper
    const feeBumpTx = StellarSdk.TransactionBuilder.buildFeeBumpTransaction(
      sponsorKeypair,     // fee source (sponsor pays)
      "100000",           // base fee (stroops) — sponsor pays this
      innerTx,
      NETWORK_PASSPHRASE
    );

    // Sponsor signs the fee bump
    feeBumpTx.sign(sponsorKeypair);

    // Submit to network
    const response = await horizonServer.submitTransaction(feeBumpTx);
    return { success: true, hash: response.hash };

  } catch (e) {
    console.error("Fee bump error:", e);
    return { success: false, error: e.message };
  }
};

/**
 * Fee Bump for Soroban transactions
 * Used for NFT mint, escrow operations
 */
export const submitSorobanWithFeeBump = async (
  innerSignedXdr,
  sponsorSecret
) => {
  try {
    const sponsorKeypair = StellarSdk.Keypair.fromSecret(sponsorSecret);

    // Parse inner transaction
    const innerTx = StellarSdk.TransactionBuilder.fromXDR(
      innerSignedXdr,
      NETWORK_PASSPHRASE
    );

    // Build fee bump
    const feeBumpTx = StellarSdk.TransactionBuilder.buildFeeBumpTransaction(
      sponsorKeypair,
      "1000000",          // higher fee for Soroban
      innerTx,
      NETWORK_PASSPHRASE
    );

    feeBumpTx.sign(sponsorKeypair);

    // Submit via Soroban RPC
    const result = await SOROBAN_SERVER.sendTransaction(feeBumpTx);

    // Poll for confirmation
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 1500));
      const poll = await SOROBAN_SERVER.getTransaction(result.hash);
      if (poll.status === "SUCCESS") return { success: true, hash: result.hash };
      if (poll.status === "FAILED") return { success: false, error: "Transaction failed on chain" };
    }

    return { success: false, error: "Transaction timed out" };

  } catch (e) {
    console.error("Soroban fee bump error:", e);
    return { success: false, error: e.message };
  }
};

/**
 * Check if sponsor is configured
 */
export const isSponsorAvailable = () => {
  return !!process.env.REACT_APP_SPONSOR_SECRET;
};

/**
 * Get sponsor public key (for display)
 */
export const getSponsorAddress = () => {
  const secret = process.env.REACT_APP_SPONSOR_SECRET;
  if (!secret) return null;
  try {
    return StellarSdk.Keypair.fromSecret(secret).publicKey();
  } catch {
    return null;
  }
};