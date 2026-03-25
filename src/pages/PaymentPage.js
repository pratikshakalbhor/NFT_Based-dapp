import React, { useState } from "react";
import { motion } from "framer-motion";
import { useWallet } from "../WalletContext";
import { signTransaction } from "../walletService";
import * as StellarSdk from "@stellar/stellar-sdk";
import { containerVariants, itemVariants, XLMIcon } from "../components/ProfilePage";
import "../App.css";
import "./PaymentPage.css";
import "./PaymentPage.css";
import { NETWORK, NETWORK_PASSPHRASE } from "../constants";
import { useTheme } from "../context/ThemeContext";
import { submitWithFeeBump, isSponsorAvailable } from "../utils/feeBump";

export default function PaymentPage({ walletAddress, balance, setBalance, server }) {
  const { walletType } = useWallet();
  const { isDark } = useTheme();
  const [receiver, setReceiver] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState("");

  const sendPayment = async () => {
    setTxHash("");
    setStatus("");

    // --- Validations ---
    if (!receiver || !amount) {
      setStatus("Receiver and amount are required.");
      return;
    }
    if (parseFloat(amount) <= 0) {
      setStatus("Amount must be a positive number.");
      return;
    }
    if (parseFloat(balance) < parseFloat(amount)) {
      setStatus("Insufficient balance for this payment.");
      return;
    }
    if (!StellarSdk.StrKey.isValidEd25519PublicKey(receiver.trim())) {
      setStatus("Invalid receiver address.");
      return;
    }

    try {
      setLoading(true);
      setStatus("Checking destination account...");

      //  Step 1: Destination account exist check
      try {
        await server.loadAccount(receiver.trim());
      } catch {
        throw new Error("Destination account not found! Fund it first with at least 1 XLM.");
      }

      //  Step 2: Source account load
      setStatus("Loading your account...");
      const account = await server.loadAccount(walletAddress);

      //  Step 3: Amount - 7 decimal places, string format
      const fixedAmount = parseFloat(amount).toFixed(7);


      const FEE = "100000";

      setStatus("Building transaction...");
      const transaction = new StellarSdk.TransactionBuilder(account, {
        fee: FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          StellarSdk.Operation.payment({
            destination: receiver.trim(),
            asset: StellarSdk.Asset.native(),
            amount: fixedAmount,
          })
        )
        .setTimeout(60) //  60 seconds timeout
        .build();

      //  Step 4: Sign
      setStatus("Please sign in your wallet...");
      const xdr = transaction.toXDR();
      console.log(" TX XDR built successfully");

      const signedXDR = await signTransaction(xdr, walletType, NETWORK, NETWORK_PASSPHRASE);

      if (!signedXDR) {
        setStatus("Transaction Cancelled by User.");
        setLoading(false);
        return;
      }

      //  Step 5: Handle both Freighter formats
      const signedXDRString =
        typeof signedXDR === "object" && signedXDR.signedTxXdr
          ? signedXDR.signedTxXdr
          : signedXDR;

      let result;
      if (isSponsorAvailable()) {
        // ✅ Gasless — Sponsor pays fee
        setStatus("Sponsor paying fee (gasless transaction)...");
        const bumpResult = await submitWithFeeBump(signedXDRString, process.env.REACT_APP_SPONSOR_SECRET);
        if (!bumpResult.success) throw new Error(bumpResult.error);
        result = { hash: bumpResult.hash };
      } else {
        // Normal — User pays fee
        const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedXDRString, NETWORK_PASSPHRASE);
        setStatus("Submitting transaction...");
        console.log("Submitting to Horizon...");
        result = await server.submitTransaction(signedTx);
      }
      console.log(" Success:", result.hash);

      setTxHash(result.hash);
      setStatus(`Payment Successful!`);

      //  Step 7: Refresh balance
      setTimeout(async () => {
        try {
          const updatedAccount = await server.loadAccount(walletAddress);
          const xlm = updatedAccount.balances.find((b) => b.asset_type === "native");
          setBalance(parseFloat(xlm.balance).toFixed(2));
        } catch (e) {
          console.error("Balance update failed:", e);
        }
      }, 2000);

      setReceiver("");
      setAmount("");

    } catch (e) {
      console.error(" Payment Error:", e);

      // Detailed error decode
      let errorMessage = "Transaction Failed. Please try again.";
      const message = (e?.message || "").toLowerCase();

      if (message.includes("rejected") || message.includes("declined") || message.includes("cancel")) {
        errorMessage = "Transaction Cancelled by User.";
      } else if (message.includes("destination account not found")) {
        errorMessage = "Error: Destination account not found. Fund it first!";
      } else if (e.response?.data) {
        const { title, extras } = e.response.data;
        const txCode = extras?.result_codes?.transaction;
        const opCode = extras?.result_codes?.operations?.[0];

        console.error(" Horizon error codes:", { txCode, opCode });

        if (txCode === "tx_insufficient_balance" || opCode === "op_underfunded") {
          errorMessage = "Error: Insufficient balance (including minimum reserve of 1 XLM).";
        } else if (opCode === "op_no_destination") {
          errorMessage = "Error: Destination account does not exist on testnet.";
        } else if (txCode === "tx_bad_seq") {
          errorMessage = "Error: Sequence mismatch. Please try again.";
        } else if (txCode === "tx_bad_auth") {
          errorMessage = "Error: Auth failed. Reconnect your wallet and try again.";
        } else {
          errorMessage = `Error: ${title || txCode || opCode || "Unknown network error"}`;
        }
      } else if (e.message) {
        errorMessage = `Error: ${e.message}`;
      }

      setStatus(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getStatusClassName = () => {
    if (!status) return "";
    const s = status.toLowerCase();
    if (s.includes("success") || s.includes("✅")) return "success";
    if (
      s.includes("failed") || s.includes("invalid") || s.includes("error") ||
      s.includes("insufficient") || s.includes("cancelled") ||
      s.includes("required") || s.includes("must be") || s.includes("not found")
    ) return "error";
    return "info";
  };

  return (
    <div className="payment-page-wrapper">
      <motion.div
        className="payment-container"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants} style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 700, letterSpacing: "-0.03em", color: isDark ? "#fff" : "#1a1a2e" }}>
            Send <span style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Payment</span>
          </h1>
          <p style={{ color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)", marginTop: '4px' }}>
            Secure & Fast Global Transactions
          </p>
          <div style={{ width: "48px", height: "3px", background: "linear-gradient(135deg, #8b5cf6, #3b82f6)", borderRadius: "2px", margin: '8px auto 0' }} />
        </motion.div>

        <motion.div
          className="card payment-card"
          variants={itemVariants}
          style={{
            background: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.9)",
            border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)",
            boxShadow: isDark ? "0 25px 50px rgba(88,28,135,0.4)" : "0 4px 24px rgba(0,0,0,0.08)"
          }}
        >
          {isSponsorAvailable() && (
            <div style={{
              padding: "10px 16px",
              background: "rgba(16,185,129,0.1)",
              border: "1px solid rgba(16,185,129,0.2)",
              borderRadius: "10px",
              fontSize: "0.8rem",
              color: "#10b981",
              marginBottom: "16px",
            }}>
              Gasless Transaction Enabled — Network fee sponsored
            </div>
          )}
          {/* Balance Display */}
          <div
            className="balance-card"
            style={{
              background: isDark ? "rgba(255,255,255,0.05)" : "rgba(99,102,241,0.06)",
              border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(99,102,241,0.15)"
            }}
          >
            <span className="balance-label" style={{ color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)" }}>Available Balance</span>
            <div className="balance-value-container">
              <XLMIcon className="xlm-icon-large" style={{ color: isDark ? "#fff" : "#1a1a2e" }} />
              <span className="balance-amount-large" style={{ color: isDark ? "#fff" : "#1a1a2e" }}>{balance}</span>
              <span className="balance-currency" style={{ color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)" }}>XLM</span>
            </div>
          </div>

          {/* Payment Form */}
          <div className="payment-form">
            <div className="input-group">
              <label className="input-label" style={{ color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)" }}>Receiver Address</label>
              <input
                className="form-input"
                placeholder="G..."
                value={receiver}
                onChange={(e) => setReceiver(e.target.value)}
                disabled={loading}
                style={{
                  background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
                  border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.12)",
                  color: isDark ? "#fff" : "#1a1a2e"
                }}
              />
            </div>

            <div className="input-group">
              <label className="input-label" style={{ color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)" }}>Amount (XLM)</label>
              <input
                className="form-input"
                placeholder="0.00"
                type="number"
                min="0.0000001"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={loading}
                style={{
                  background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
                  border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.12)",
                  color: isDark ? "#fff" : "#1a1a2e"
                }}
              />
            </div>

            <button
              className="button button-primary button-large"
              onClick={sendPayment}
              disabled={loading}
              style={{ marginTop: "12px" }}
            >
              {loading ? (
                <><span className="spinner"></span> Processing...</>
              ) : (
                "Send Payment"
              )}
            </button>
          </div>

          {/* Status Message */}
          {status && (
            <motion.div
              className={`status-message ${getStatusClassName()}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {status}
            </motion.div>
          )}


          {txHash && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                marginTop: "12px",
                padding: "12px 16px",
                background: "rgba(16,185,129,0.08)",
                border: "1px solid rgba(16,185,129,0.2)",
                borderRadius: "12px",
              }}
            >
              <p style={{ color: "#6ee7b7", fontSize: "0.78rem", marginBottom: "6px", fontWeight: 600 }}>
                Transaction Hash:
              </p>
              <p style={{ color: "#34d399", fontSize: "0.72rem", wordBreak: "break-all", fontFamily: "monospace", margin: 0 }}>
                {txHash}
              </p>
              <a
                href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-block", marginTop: "8px",
                  color: "#8b5cf6", fontSize: "0.78rem", fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                View on Explorer ↗
              </a>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}