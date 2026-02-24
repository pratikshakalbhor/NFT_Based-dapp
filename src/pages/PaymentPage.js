import React, { useState } from "react";
import { signTransaction } from "@stellar/freighter-api";
import * as StellarSdk from "@stellar/stellar-sdk";
import "../App.css";
import { NETWORK, NETWORK_PASSPHRASE } from "../constants";
 
export default function PaymentPage({ walletAddress, balance, setBalance, server }) {
  const [receiver, setReceiver] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const shortAddress = (addr) => {
    if (!addr) return "";
    return addr.slice(0, 4) + "..." + addr.slice(-4);
  };

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
    <div className="card">
      <h1 className="title">Stellar Payment dApp</h1>
      <p className="subtitle">Secure & Fast Payments</p>
      <div className="wallet-section">
        <div className="status-badge connected">
          <span className="status-dot"></span>
          Wallet: {shortAddress(walletAddress)}
        </div>
        <div className="balance-display">
          <span className="balance-amount">{balance}</span>
          <span className="balance-symbol"> XLM</span>
        </div>
      </div>

      <div className="form-group">
        <input
          className="form-input"
          placeholder="Receiver Address (G...)"
          value={receiver}
          onChange={(e) => setReceiver(e.target.value)}
        />
      </div>
      <div className="form-group">
        <input
          className="form-input"
          placeholder="Amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>

      <button
        className="button button-primary button-large"
        onClick={sendPayment}
        disabled={loading}
      >
        {loading ? "Sending..." : "Send XLM"}
      </button>
      {status && (
        <div className={`status-message ${getStatusClassName()}`}>{status}</div>
      )}
    </div>
  );
}