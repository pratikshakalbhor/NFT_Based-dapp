import React, { useState } from "react";
import { motion } from "framer-motion";
import { signTransaction } from "@stellar/freighter-api";
import * as StellarSdk from "@stellar/stellar-sdk";
import { containerVariants, itemVariants } from "../components/ProfilePageAnimations";
import { XLMIcon } from "../components/ProfilePageIcons";
import "../App.css";
import "./PaymentPage.css";
import { NETWORK, NETWORK_PASSPHRASE } from "../constants";
 
export default function PaymentPage({ walletAddress, balance, setBalance, server }) {
  const [receiver, setReceiver] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const sendPayment = async () => {
    if (!receiver || !amount) {
      setStatus("Receiver and amount are required.");
      return;
    }

    if (!StellarSdk.StrKey.isValidEd25519PublicKey(receiver)) {
      setStatus("Invalid receiver address.");
      return;
    }

    try {
      setLoading(true);
      setStatus("Preparing transaction...");

      const account = await server.loadAccount(walletAddress);
      const fee = await server.fetchBaseFee();

      const transaction = new StellarSdk.TransactionBuilder(account, {
        fee: fee.toString(),
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          StellarSdk.Operation.payment({
            destination: receiver.trim(),
            asset: StellarSdk.Asset.native(),
            amount: amount.toString(),
          })
        )
        .setTimeout(30)
        .build();

      const xdr = transaction.toXDR();
      const signedXDR = await signTransaction(xdr, {
        network: NETWORK,
        networkPassphrase: NETWORK_PASSPHRASE,
      });

      if (!signedXDR) {
        setStatus("Transaction Cancelled by User");
        setLoading(false);
        return;
      }

      // Freighter might return the XDR string directly or an object { signedTxXdr: ... }
      const signedXDRString = typeof signedXDR === 'object' && signedXDR.signedTxXdr 
        ? signedXDR.signedTxXdr 
        : signedXDR;

      const signedTx = StellarSdk.TransactionBuilder.fromXDR(
        signedXDRString,
        NETWORK_PASSPHRASE
      );

      setStatus("Submitting...");
      const result = await server.submitTransaction(signedTx);
      setStatus(`Success! Hash: ${result.hash}`);

      // Reload balance after 2 seconds to allow network sync
      setTimeout(async () => {
        try {
          const account = await server.loadAccount(walletAddress);
          const xlm = account.balances.find((b) => b.asset_type === "native");
          setBalance(parseFloat(xlm.balance).toFixed(2));
        } catch (e) {
          console.error("Failed to update balance:", e);
        }
      }, 2000);

      setReceiver("");
      setAmount("");
    } catch (e) {
      console.error(e);

      const message = (e?.message || "").toLowerCase();

      if (
        message.includes("rejected") ||
        message.includes("declined") ||
        message.includes("cancel")
      ) {
        setStatus("Transaction Cancelled by User");
      } else {
        setStatus("Transaction Failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusClassName = () => {
    if (!status) return "";
    if (status.includes("Success")) return "success";
    if (status.includes("Failed") || status.includes("Invalid"))
      return "warning";
    return "info";
  };

  return (
    <div className="payment-page-wrapper">
      <div className="payment-bg-gradient" />
      
      <motion.div 
        className="payment-container"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div className="payment-header" variants={itemVariants}>
          <h1 className="payment-title">Send Payment</h1>
          <p className="payment-subtitle">Secure & Fast Global Transactions</p>
        </motion.div>

        <motion.div className="card payment-card" variants={itemVariants}>
          {/* Balance Display */}
          <div className="balance-card">
            <span className="balance-label">Available Balance</span>
            <div className="balance-value-container">
              <XLMIcon className="xlm-icon-large" />
              <span className="balance-amount-large">{balance}</span>
              <span className="balance-currency">XLM</span>
            </div>
          </div>

          {/* Payment Form */}
          <div className="payment-form">
            <div className="input-group">
              <label className="input-label">Receiver Address</label>
              <input
                className="form-input"
                placeholder="G..."
                value={receiver}
                onChange={(e) => setReceiver(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="input-group">
              <label className="input-label">Amount (XLM)</label>
              <input
                className="form-input"
                placeholder="0.00"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={loading}
              />
            </div>

            <button
              className="button button-primary button-large"
              onClick={sendPayment}
              disabled={loading}
              style={{ marginTop: '12px' }}
            >
              {loading ? <><span className="spinner"></span> Processing...</> : "Send Payment"}
            </button>
          </div>

          {status && (
            <motion.div 
              className={`status-message ${getStatusClassName()}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {status}
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}