import { useState } from "react";
import { motion } from "framer-motion";
import * as StellarSdk from "@stellar/stellar-sdk";
import { useWallet } from "../WalletContext";
import { signTransaction } from "../walletService";
import { NETWORK_PASSPHRASE } from "../constants";
import { containerVariants, itemVariants } from "../components/ProfilePageAnimations";
import { getValidImageIds } from "../utils/imageMap";
import { CheckIcon, CopyIcon } from "../components/ProfilePageIcons";
import "./MintPage.css";

const MintPage = ({ walletAddress, server, setBalance, setNfts, nfts }) => {
  const { walletType } = useWallet();
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState("info"); // 'info', 'success', 'warning'
  const [txHash, setTxHash] = useState("");
  const [mintedAssetCode, setMintedAssetCode] = useState("");
  const [copied, setCopied] = useState(false);

  const fetchBalance = async () => {
    try {
      const account = await server.loadAccount(walletAddress);
      const xlmBalance = account.balances.find(
        (b) => b.asset_type === "native"
      );
      setBalance(parseFloat(xlmBalance.balance).toFixed(2));
    } catch (e) {
      console.error("Failed to fetch balance on mint page", e);
    }
  };

  const handleMint = async () => {
    setTxHash("");
    if (!name || !imageUrl) {
      setStatus("Please enter a name and image ID.");
      setStatusType("warning");
      return;
    }

    if (!walletType) {
      setStatus("Wallet not connected. Please reconnect.");
      setStatusType("warning");
      return;
    }

    const validImageIds = getValidImageIds();
    if (!validImageIds.includes(imageUrl.trim().toUpperCase())) {
      setStatus(`Invalid Image ID. Use: ${validImageIds.join(", ")}`);
      setStatusType("warning");
      return;
    }

    setLoading(true);
    setStatus("Preparing transaction...");
    setStatusType("info");

    try {
      // 1. Generate a random issuer account for this NFT
      const issuerPair = StellarSdk.Keypair.random();
      const assetCode = `NFT${Math.floor(Math.random() * 10000)}`;
      const asset = new StellarSdk.Asset(assetCode, issuerPair.publicKey());

      // 2. Load user's account
      const sourceAccount = await server.loadAccount(walletAddress);
      const fee = await server.fetchBaseFee();

      // 3. Build the transaction
      const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: fee.toString(),
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        // Op 1: Create the issuer account (funded by user)
        .addOperation(
          StellarSdk.Operation.createAccount({
            destination: issuerPair.publicKey(),
            startingBalance: "2",
          })
        )
        // Op 2: User trusts the new asset
        .addOperation(
          StellarSdk.Operation.changeTrust({
            asset: asset,
            limit: "1",
          })
        )
        // Op 3: Issuer sends the NFT (1 unit) to the user
        .addOperation(
          StellarSdk.Operation.payment({
            source: issuerPair.publicKey(),
            destination: walletAddress,
            asset: asset,
            amount: "1",
          })
        )
        // Op 4: Lock the issuer account
        .addOperation(
          StellarSdk.Operation.setOptions({
            source: issuerPair.publicKey(),
            masterWeight: 0,
            lowThreshold: 0,
            medThreshold: 0,
            highThreshold: 0,
          })
        )
        .setTimeout(StellarSdk.TimeoutInfinite)
        .build();

      // 4. Sign with the Issuer key
      tx.sign(issuerPair);

      // 5. Sign with User's wallet
      setStatus("Please sign in your wallet...");
      const signedXdr = await signTransaction(
        tx.toXDR(),
        walletType,
        NETWORK_PASSPHRASE
      );

      if (!signedXdr) {
        throw new Error("User cancelled signing");
      }

      const signedTxXdr =
        typeof signedXdr === "object" && signedXdr.signedTxXdr
          ? signedXdr.signedTxXdr
          : signedXdr;

      const signedTx = StellarSdk.TransactionBuilder.fromXDR(
        signedTxXdr,
        NETWORK_PASSPHRASE
      );

      // 6. Submit to network
      setStatus("Submitting transaction...");
      const result = await server.submitTransaction(signedTx);

      setStatus(`Success! NFT Minted. Code: ${assetCode}`);
      setStatusType("success");
      setTxHash(result.hash);
      setMintedAssetCode(assetCode);
      
      // OPTIMISTIC UPDATE: Update local state immediately
      const newNft = {
        name: name,
        imageId: imageUrl.trim().toUpperCase(),
        assetCode: assetCode,
        issuer: issuerPair.publicKey(),
      };
      setNfts((prev) => [...prev, newNft]);

      setName("");
      setImageUrl("");
      await fetchBalance(); // Refresh balance after successful mint
    } catch (e) {
      console.error(e);
      let msg = e.message || "Transaction failed";
      if (e.response?.data?.extras?.result_codes) {
        msg = `Transaction Failed: ${JSON.stringify(e.response.data.extras.result_codes)}`;
      } else if (e.response?.data?.detail) {
        msg = e.response.data.detail;
      }
      setStatus(msg);
      setStatusType("warning");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyHash = () => {
    navigator.clipboard.writeText(txHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (txHash) {
    return (
      <motion.div 
        className="success-card-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="success-icon-wrapper">
          <CheckIcon className="success-icon" />
        </div>
        <h2 className="success-title">NFT Minted Successfully</h2>
        
        <div className="nft-details-badge">
          <span className="badge-label">Asset Code</span>
          <span className="badge-value">{mintedAssetCode}</span>
        </div>

        <div className="hash-section">
          <span className="hash-label">Transaction Hash</span>
          <div className="hash-box" onClick={handleCopyHash} title="Click to copy">
            <span className="hash-text">{`${txHash.slice(0, 8)}...${txHash.slice(-8)}`}</span>
            {copied ? <CheckIcon className="copy-icon success" /> : <CopyIcon className="copy-icon" />}
          </div>
        </div>

        <div className="success-actions">
          <a
            href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="button button-secondary explorer-btn"
          >
            View on Explorer
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginLeft: '8px'}}>
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
          <button 
            className="button button-primary"
            onClick={() => {
              setTxHash("");
              setStatus("");
              setName("");
              setImageUrl("");
              setMintedAssetCode("");
            }}
          >
            Mint Another NFT
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="mint-page-wrapper">
      <div className="mint-bg-gradient" />
      <motion.div
        className="mint-container"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div className="mint-header" variants={itemVariants}>
          <h1 className="mint-title">Mint an NFT</h1>
          <p className="mint-subtitle">Create a new unique digital asset on the Stellar blockchain.</p>
        </motion.div>

        <motion.div className="card mint-card" variants={itemVariants}>
          <div className="mint-form">
            <div className="input-group">
              <label className="input-label">NFT Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. My Awesome NFT"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="input-group">
              <label className="input-label">Image ID</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. IMG1, IMG2, or IMG3"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <button className="button button-primary button-large" onClick={handleMint} disabled={loading}>
            {loading ? <><span className="spinner"></span> Minting...</> : "Mint NFT"}
          </button>

          {status && <p className={`status-message ${statusType}`}>{status}</p>}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default MintPage;