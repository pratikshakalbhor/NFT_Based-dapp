import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as StellarSdk from "@stellar/stellar-sdk";
import { useWallet } from "../WalletContext";
import { signTransaction } from "../walletService";
import { NETWORK, NETWORK_PASSPHRASE, CONTRACT_ID, SOROBAN_SERVER } from "../constants";
import { containerVariants, itemVariants } from "../components/ProfilePageAnimations";
import { CheckIcon, CopyIcon } from "../components/ProfilePageIcons";
import "./MintPage.css";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MIN_BALANCE_REQUIRED = 2.0;

const validateFile = (file) => {
  if (!file) return { valid: false, error: "No file selected." };
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return { valid: false, error: "Invalid file type. Use JPG, PNG, GIF, or WEBP." };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: "File size exceeds 5MB limit." };
  }
  return { valid: true };
};

const uploadToPinata = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  try {
    const response = await fetch("http://localhost:5000/api/upload", {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.status} ${errorText}`);
    }
    const data = await response.json();
    return data.cid;
  } catch (error) {
    console.error("IPFS Upload Error:", error);
    throw new Error(
      error.message.includes("Failed to fetch")
        ? "Backend server not running on port 5000"
        : error.message
    );
  }
};

const MintPage = ({ walletAddress, server, setBalance, setNfts, nfts }) => {
  const { walletType } = useWallet();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState("info");
  const [txHash, setTxHash] = useState("");
  const [mintedAssetCode, setMintedAssetCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [localBalance, setLocalBalance] = useState(0);
  const fileInputRef = useRef(null);

  const fetchBalance = useCallback(async () => {
    try {
      const account = await server.loadAccount(walletAddress);
      const xlmBalance = account.balances.find((b) => b.asset_type === "native");
      const bal = parseFloat(xlmBalance.balance).toFixed(2);
      setBalance(bal);
      setLocalBalance(parseFloat(bal));
    } catch (e) {
      console.error("Failed to fetch balance:", e);
    }
  }, [server, walletAddress, setBalance]);

  useEffect(() => { fetchBalance(); }, [fetchBalance]);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl("");
    }
  }, [file]);

  const handleMint = async () => {
    setTxHash("");
    if (!name) { setStatus("Please enter an NFT name."); setStatusType("warning"); return; }
    if (!walletType) { setStatus("Wallet not connected. Please reconnect."); setStatusType("warning"); return; }
    if (localBalance < MIN_BALANCE_REQUIRED) { setStatus(`Insufficient balance. Need at least ${MIN_BALANCE_REQUIRED} XLM.`); setStatusType("warning"); return; }
    if (!file) { setStatus("Please select an image file to upload."); setStatusType("warning"); return; }
    setShowConfirmation(true);
  };

  const confirmMint = async () => {
    setShowConfirmation(false);
    setLoading(true);
    setStatus("Starting mint process...");
    setStatusType("info");

    try {
      if (!file) throw new Error("No file selected.");

      // Step 1: Upload to IPFS
      setStatus("Uploading image to IPFS...");
      const cid = await uploadToPinata(file);
      const tokenURI = `https://gateway.pinata.cloud/ipfs/${cid}`;

      console.log("---------------------------------------------------");
      console.log("🚀 STARTING MINT");
      console.log("📝 Contract:", CONTRACT_ID);
      console.log("👤 Wallet:", walletAddress);
      console.log("🖼️ URI:", tokenURI);
      console.log("📛 Name:", name);
      console.log("---------------------------------------------------");

      // Step 2: Get account
      setStatus("Building transaction...");
      const sourceAccount = await SOROBAN_SERVER.getAccount(walletAddress);
      console.log("✅ Account loaded:", sourceAccount.accountId());

      // Step 3: Build tx - fee: "1000000" = max 1 XLM for Soroban
      const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: "1000000",
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          new StellarSdk.Contract(CONTRACT_ID).call(
            "mint_nft",
            new StellarSdk.Address(walletAddress).toScVal(),
            new StellarSdk.Address(walletAddress).toScVal(),
            StellarSdk.nativeToScVal(name, { type: "string" }),
            StellarSdk.nativeToScVal(tokenURI, { type: "string" })
          )
        )
        .setTimeout(60)
        .build();

      // Step 4: Simulate
      setStatus("Simulating transaction...");
      const simulation = await SOROBAN_SERVER.simulateTransaction(tx);
      console.log("🔍 Simulation:", simulation);

      if (StellarSdk.rpc.Api.isSimulationError(simulation)) {
        console.error("❌ Simulation Error:", simulation.error);
        throw new Error(`Simulation failed: ${simulation.error}`);
      }

      // Step 5: Assemble
      const assembledTx = StellarSdk.rpc.assembleTransaction(tx, simulation).build();
      console.log("✅ Transaction assembled");

      // Step 6: Sign
      setStatus("Please sign in your wallet...");
      const signedXDR = await signTransaction(
        assembledTx.toXDR(),
        walletType,
        NETWORK,
        NETWORK_PASSPHRASE
      );
      if (!signedXDR) throw new Error("User cancelled signing");
      console.log("✅ Transaction signed");

      // Step 7: Convert XDR
      const signedTxXdr =
        typeof signedXDR === "object" && signedXDR.signedTxXdr
          ? signedXDR.signedTxXdr
          : signedXDR;

      const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE);

      // Step 8: Submit
      setStatus("Submitting transaction...");
      const response = await SOROBAN_SERVER.sendTransaction(signedTx);
      console.log("📤 Submit response:", response);

      if (response.status === "ERROR") {
        console.error("❌ ERROR response:", response);
        if (response.errorResult) {
          try {
            const xdr = response.errorResult.toXDR("base64");
            const decoded = StellarSdk.xdr.TransactionResult.fromXDR(xdr, "base64");
            const code = decoded.result().switch().name;
            console.error("🔴 Error code:", code);
            if (code === "txBAD_AUTH") {
              throw new Error("Auth Error: Please disconnect and reconnect your Freighter wallet.");
            }
            if (code === "txINSUFFICIENT_FEE") {
              throw new Error("Insufficient fee. Please try again.");
            }
            throw new Error(`Transaction failed: ${code}`);
          } catch (decodeErr) {
            if (decodeErr.message.includes("Transaction failed") || decodeErr.message.includes("Auth Error")) {
              throw decodeErr;
            }
          }
        }
        throw new Error("Transaction submission failed. Status: ERROR");
      }

      if (response.status !== "PENDING") {
        throw new Error(`Unexpected status: ${response.status}`);
      }

      // Step 9: Poll
      setStatus("Waiting for confirmation...");
      let finalStatus;
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        try {
          finalStatus = await SOROBAN_SERVER.getTransaction(response.hash);
          console.log(`⏳ Poll ${i + 1}:`, finalStatus.status);
          if (finalStatus.status !== "NOT_FOUND") break;
        } catch (pollErr) {
          console.warn(`Poll ${i + 1}:`, pollErr);
        }
      }

      if (finalStatus?.status === "FAILED") {
        throw new Error("Transaction failed after submission.");
      }

      // Step 10: Success
      console.log("🎉 NFT Minted!");
      setStatus("Success! NFT Minted.");
      setStatusType("success");
      setTxHash(response.hash);
      setNfts((prev) => [...prev, { name, imageId: tokenURI, assetCode: "NFT", issuer: CONTRACT_ID }]);
      setName("");
      setDescription("");
      setFile(null);
      await fetchBalance();

    } catch (e) {
      console.error("❌ Mint Error:", e);
      let msg = e.message || "Transaction failed";
      if (msg.includes("txBAD_AUTH") || msg.includes("Auth Error")) {
        msg = "Auth Error: Disconnect and reconnect your wallet, then try again.";
      } else if (msg.includes("non-existent contract function") || msg.includes("MissingValue")) {
        msg = "Contract Error: Function not found. Check CONTRACT_ID in constants.js";
      } else if (msg.includes("Simulation failed")) {
        msg = `Simulation Error: ${msg}`;
      } else if (msg.includes("Backend server")) {
        msg = "Backend not running. Run: cd backend && node server.js";
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

  const styles = `
    .mint-page-wrapper { min-height: 100vh; padding: 2rem 1rem; position: relative; overflow: hidden; }
    .mint-bg-glow {
      position: absolute; width: 800px; height: 800px;
      background: radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%);
      top: -300px; left: 50%; transform: translateX(-50%);
      pointer-events: none; z-index: 0; animation: pulse-glow 10s infinite ease-in-out;
    }
    @keyframes pulse-glow {
      0%, 100% { opacity: 0.5; transform: translateX(-50%) scale(1); }
      50% { opacity: 0.8; transform: translateX(-50%) scale(1.1); }
    }
    .glass-card-premium {
      background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px); border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05);
      overflow: hidden; position: relative;
    }
    .mint-btn-gradient {
      background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%);
      box-shadow: 0 4px 20px rgba(139, 92, 246, 0.3); transition: all 0.3s ease;
    }
    .mint-btn-gradient:hover:not(:disabled) {
      box-shadow: 0 8px 30px rgba(139, 92, 246, 0.5); transform: translateY(-2px);
    }
  `;

  if (txHash) {
    return (
      <motion.div className="success-card-container" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="success-icon-wrapper"><CheckIcon className="success-icon" /></div>
        <h2 className="success-title text-2xl font-bold text-white mb-2">NFT Minted Successfully! 🎉</h2>
        <div className="nft-details-badge">
          <span className="badge-label">Asset</span>
          <span className="badge-value">{mintedAssetCode || "NFT"}</span>
        </div>
        <div className="hash-section">
          <span className="hash-label">Transaction Hash</span>
          <div className="hash-box" onClick={handleCopyHash} title="Click to copy">
            <span className="hash-text">{`${txHash.slice(0, 8)}...${txHash.slice(-8)}`}</span>
            {copied ? <CheckIcon className="copy-icon success" /> : <CopyIcon className="copy-icon" />}
          </div>
        </div>
        <div className="success-actions">
          <a href={`https://stellar.expert/explorer/testnet/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="button button-secondary explorer-btn">
            View on Explorer
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: "8px" }}>
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
          <button className="button button-primary" onClick={() => { setTxHash(""); setStatus(""); setName(""); setMintedAssetCode(""); }}>
            Mint Another NFT
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="mint-page-wrapper">
      <style>{styles}</style>
      <div className="mint-bg-glow" />
      <motion.div className="max-w-5xl mx-auto relative z-10" variants={containerVariants} initial="hidden" animate="visible">
        <motion.div className="text-center mb-10" variants={itemVariants}>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-3">
            Mint <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">NFT</span>
          </h1>
          <p className="text-gray-400 text-lg">Create and manage your digital assets on Stellar</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <motion.div className="lg:col-span-8 space-y-6" variants={itemVariants}>
            <div className="glass-card-premium p-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400 ml-1">NFT Name</label>
                  <input type="text"
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
                    placeholder="Enter NFT Name" value={name} onChange={(e) => setName(e.target.value)} disabled={loading} />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400 ml-1">Description</label>
                  <textarea
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all resize-none h-24"
                    placeholder="Describe your NFT..." value={description} onChange={(e) => setDescription(e.target.value)} disabled={loading} />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400 ml-1">Upload NFT Image</label>
                  <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:border-purple-500/50 transition-colors cursor-pointer bg-black/20"
                    onClick={() => fileInputRef.current?.click()}>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          const selectedFile = e.target.files[0];
                          const validation = validateFile(selectedFile);
                          if (!validation.valid) { setStatus(validation.error); setStatusType("warning"); return; }
                          setFile(selectedFile); setStatus("");
                        }
                      }} disabled={loading} />
                    {file ? (
                      <div className="text-green-400 font-medium flex items-center justify-center gap-2">
                        <CheckIcon className="w-5 h-5" />{file.name}
                      </div>
                    ) : (
                      <div className="text-gray-400">
                        <div className="mb-2 text-2xl">📂</div>
                        <span className="text-sm">Click to upload image</span>
                        <p className="text-xs text-gray-600 mt-1">Max 5MB (JPG, PNG, GIF, WEBP)</p>
                      </div>
                    )}
                  </div>
                </div>

                <button className="mint-btn-gradient w-full py-4 rounded-xl text-white font-bold text-lg mt-6 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                  onClick={handleMint} disabled={loading}>
                  {loading ? (
                    <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Minting on Stellar...</span></>
                  ) : (
                    <><span>Mint NFT</span>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                    </>
                  )}
                </button>

                {status && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                    className={`p-4 rounded-xl text-sm font-medium border ${
                      statusType === "success" ? "bg-green-500/10 border-green-500/20 text-green-400"
                      : statusType === "warning" ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-400"
                      : "bg-blue-500/10 border-blue-500/20 text-blue-400"}`}>
                    {status}
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>

          <motion.div className="lg:col-span-4" variants={itemVariants}>
            <div className="glass-card-premium p-6 sticky top-24">
              <h3 className="text-lg font-semibold text-white mb-4">Preview</h3>
              <div className="aspect-square rounded-2xl bg-black/40 border border-white/10 overflow-hidden relative group">
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    onError={(e) => { e.target.src = "https://via.placeholder.com/400?text=No+Image"; }} />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-600">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mb-2 opacity-50">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                    </svg>
                    <span className="text-sm">Select an image</span>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent pt-10">
                  <div className="text-white font-bold text-lg truncate">{name || "Untitled NFT"}</div>
                  <div className="text-purple-400 text-xs font-mono mt-1">{file ? file.name : "NO ASSET SELECTED"}</div>
                </div>
              </div>
              <div className="mt-6 space-y-3">
                <div className="flex justify-between text-sm"><span className="text-gray-500">Network</span><span className="text-gray-300">Stellar Testnet</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500">Standard</span><span className="text-gray-300">Soroban NFT</span></div>
                <div className="h-px bg-white/10 my-2" />
                <div className="flex justify-between text-sm font-medium"><span className="text-gray-400">Estimated Fee</span><span className="text-purple-400">~0.01 XLM</span></div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showConfirmation && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-[#1e1e2d] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl"
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
              <h3 className="text-xl font-bold text-white mb-4">Confirm Minting</h3>
              <p className="text-gray-400 mb-6">You are about to mint <strong>"{name}"</strong>. This cannot be undone and will cost a small amount of XLM.</p>
              <div className="flex gap-3">
                <button className="flex-1 px-4 py-2 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 transition-colors" onClick={() => setShowConfirmation(false)}>Cancel</button>
                <button className="flex-1 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold hover:opacity-90 transition-opacity" onClick={confirmMint}>Confirm & Mint</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MintPage;