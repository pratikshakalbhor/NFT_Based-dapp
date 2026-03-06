import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as StellarSdk from "@stellar/stellar-sdk";
import { useWallet } from "../WalletContext";
import { signTransaction } from "../walletService";
import { NETWORK, NETWORK_PASSPHRASE } from "../constants";
import { containerVariants, itemVariants } from "../components/ProfilePageAnimations";

const HORIZON_URL = "https://horizon-testnet.stellar.org";

export default function MarketplacePage({ walletAddress, nfts, server }) {
  const { walletType } = useWallet();

  const [listings, setListings] = useState([]);

  useEffect(() => {
    if (!nfts || nfts.length === 0) return;
    const unique = nfts.filter((nft, index, self) =>
      index === self.findIndex((n) =>
        n.name === nft.name && (n.imageId || n.image) === (nft.imageId || nft.image)
      )
    );
    setListings(
      unique.map((nft, i) => ({
        id: i + 1,
        name: nft.name,
        image: nft.imageId || nft.image || "",
        price: "10",
        owner: `${walletAddress?.slice(0, 6)}...${walletAddress?.slice(-4)}`,
        ownerFull: walletAddress,
        listed: false,
      }))
    );
  }, [nfts, walletAddress]);

  const [buyingId, setBuyingId] = useState(null);
  const [successTx, setSuccessTx] = useState(null);
  const [showListModal, setShowListModal] = useState(false);
  const [listPrice, setListPrice] = useState("");
  const [selectedNft, setSelectedNft] = useState(null);
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [statusMsg, setStatusMsg] = useState("");

  const filteredListings = listings
    .filter((n) => {
      if (filter === "sale") return n.listed;
      if (filter === "mine") return n.ownerFull === walletAddress;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "price-low") return parseFloat(a.price) - parseFloat(b.price);
      if (sortBy === "price-high") return parseFloat(b.price) - parseFloat(a.price);
      return b.id - a.id;
    });

  const handleBuy = async (nft) => {
    if (!walletAddress || !walletType) {
      setStatusMsg("Please connect your wallet first.");
      return;
    }
    if (nft.ownerFull === walletAddress) {
      setStatusMsg("You cannot buy your own NFT!");
      setTimeout(() => setStatusMsg(""), 3000);
      return;
    }

    setBuyingId(nft.id);
    setStatusMsg("Processing purchase...");

    try {
      const horizonServer = new StellarSdk.Horizon.Server(HORIZON_URL);
      const sourceAccount = await horizonServer.loadAccount(walletAddress);

      const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: "1000000",
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          StellarSdk.Operation.payment({
            destination: nft.ownerFull,
            asset: StellarSdk.Asset.native(),
            amount: nft.price,
          })
        )
        .setTimeout(60)
        .build();

      setStatusMsg("Please sign the transaction...");
      const signedXDR = await signTransaction(tx.toXDR(), walletType, NETWORK, NETWORK_PASSPHRASE);
      if (!signedXDR) throw new Error("Signing cancelled");

      const signedTxXdr =
        typeof signedXDR === "object" && signedXDR.signedTxXdr
          ? signedXDR.signedTxXdr
          : signedXDR;

      const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE);

      setStatusMsg("Submitting transaction...");
      const response = await horizonServer.submitTransaction(signedTx);

      setSuccessTx({ hash: response.hash, nftName: nft.name, price: nft.price });
      setListings((prev) => prev.filter((n) => n.id !== nft.id));
      setStatusMsg("");
    } catch (e) {
      console.error("Buy error:", e);
      setStatusMsg(`Error: ${e.message || "Transaction failed"}`);
      setTimeout(() => setStatusMsg(""), 4000);
    } finally {
      setBuyingId(null);
    }
  };

  const handleOpenListModal = (nft) => {
    setSelectedNft(nft);
    setListPrice(nft.price);
    setShowListModal(true);
  };

  const confirmListing = () => {
    if (!listPrice || parseFloat(listPrice) <= 0) {
      setStatusMsg("Please enter a valid price.");
      return;
    }
    setListings((prev) =>
      prev.map((n) =>
        n.id === selectedNft.id ? { ...n, price: listPrice, listed: true } : n
      )
    );
    setShowListModal(false);
    setListPrice("");
    setSelectedNft(null);
    setStatusMsg("✅ NFT listed for sale successfully!");
    setTimeout(() => setStatusMsg(""), 3000);
  };

  const handleUnlist = (nftId) => {
    setListings((prev) =>
      prev.map((n) => (n.id === nftId ? { ...n, listed: false } : n))
    );
    setStatusMsg("NFT removed from sale.");
    setTimeout(() => setStatusMsg(""), 3000);
  };

  const listedCount = listings.filter((n) => n.listed).length;

  return (
    <div style={{ minHeight: "100vh", padding: "2rem 1rem" }}>
      <style>{`
        .market-card {
          background: rgba(15, 15, 30, 0.7);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px; overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          backdrop-filter: blur(20px);
        }
        .market-card:hover {
          border-color: rgba(139, 92, 246, 0.4);
          box-shadow: 0 20px 40px rgba(139, 92, 246, 0.15);
          transform: translateY(-6px);
        }
        .buy-btn {
          background: linear-gradient(135deg, #8b5cf6, #3b82f6);
          color: white; border: none; border-radius: 12px;
          padding: 10px 20px; font-weight: 700; font-size: 0.9rem;
          cursor: pointer; width: 100%; transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3);
        }
        .buy-btn:hover:not(:disabled) {
          box-shadow: 0 8px 25px rgba(139, 92, 246, 0.5);
          transform: translateY(-1px);
        }
        .buy-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .list-btn {
          background: rgba(139,92,246,0.15);
          border: 1px solid rgba(139,92,246,0.3);
          color: #a78bfa; border-radius: 12px;
          padding: 10px 20px; font-weight: 700; font-size: 0.9rem;
          cursor: pointer; width: 100%; transition: all 0.3s ease;
        }
        .list-btn:hover {
          background: rgba(139,92,246,0.25);
          border-color: rgba(139,92,246,0.5);
        }
        .unlist-btn {
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.3);
          color: #f87171; border-radius: 12px;
          padding: 10px 20px; font-weight: 700; font-size: 0.9rem;
          cursor: pointer; width: 100%; transition: all 0.3s ease;
          margin-top: 8px;
        }
        .unlist-btn:hover { background: rgba(239,68,68,0.2); }
        .filter-btn {
          padding: 8px 20px; border-radius: 999px; font-size: 0.85rem;
          font-weight: 600; cursor: pointer; transition: all 0.2s ease;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.03); color: #94a3b8;
        }
        .filter-btn.active {
          background: rgba(139,92,246,0.2);
          border-color: rgba(139,92,246,0.4); color: #a78bfa;
        }
        .price-tag {
          background: linear-gradient(135deg, rgba(139,92,246,0.2), rgba(59,130,246,0.2));
          border: 1px solid rgba(139,92,246,0.3);
          border-radius: 10px; padding: 6px 12px;
          color: #a78bfa; font-weight: 700; font-size: 1rem;
        }
        .for-sale-badge {
          position: absolute; top: 12px; left: 12px;
          background: linear-gradient(135deg, #8b5cf6, #3b82f6);
          color: white; font-size: 0.7rem; font-weight: 800;
          padding: 4px 10px; border-radius: 8px; letter-spacing: 0.05em;
        }
        .own-badge {
          position: absolute; top: 12px; right: 12px;
          background: rgba(16,185,129,0.2); color: #10b981;
          border: 1px solid rgba(16,185,129,0.4);
          font-size: 0.7rem; font-weight: 800;
          padding: 4px 10px; border-radius: 8px;
        }
        .success-overlay {
          position: fixed; inset: 0; z-index: 100;
          background: rgba(0,0,0,0.85); backdrop-filter: blur(10px);
          display: flex; align-items: center; justify-content: center;
        }
        .success-card {
          background: linear-gradient(135deg, rgba(15,15,30,0.95), rgba(30,20,50,0.95));
          border: 1px solid rgba(139,92,246,0.4); border-radius: 24px;
          padding: 40px; max-width: 420px; width: 90%;
          text-align: center; box-shadow: 0 30px 60px rgba(139,92,246,0.3);
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <motion.div className="max-w-7xl mx-auto" variants={containerVariants} initial="hidden" animate="visible">

        {/* Header */}
        <motion.div className="text-center mb-10" variants={itemVariants}>
          <h1 style={{ fontSize: "2.8rem", fontWeight: 800, color: "white", marginBottom: "8px" }}>
            NFT{" "}
            <span style={{ background: "linear-gradient(135deg, #8b5cf6, #3b82f6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Marketplace
            </span>
          </h1>
          <p style={{ color: "#94a3b8", fontSize: "1.1rem" }}>
            Buy and sell NFTs on the Stellar Network
          </p>

          {/* Stats */}
          <div style={{ display: "flex", justifyContent: "center", gap: "32px", marginTop: "24px", flexWrap: "wrap" }}>
            {[
              { label: "Your NFTs", value: listings.length },
              { label: "Listed for Sale", value: listedCount },
              { label: "Total Value", value: `${listings.filter(n => n.listed).reduce((a, n) => a + parseFloat(n.price || 0), 0)} XLM` },
            ].map((stat) => (
              <div key={stat.label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#a78bfa" }}>{stat.value}</div>
                <div style={{ fontSize: "0.8rem", color: "#64748b" }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Controls */}
        <motion.div variants={itemVariants} style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "24px", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {[
              { key: "all", label: "All NFTs" },
              { key: "sale", label: "🏷️ For Sale" },
              { key: "mine", label: "👤 Mine" },
            ].map(({ key, label }) => (
              <button key={key} className={`filter-btn ${filter === key ? "active" : ""}`} onClick={() => setFilter(key)}>
                {label}
              </button>
            ))}
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "10px", padding: "8px 16px", color: "#e2e8f0",
              fontSize: "0.85rem", cursor: "pointer",
            }}
          >
            <option value="newest" style={{ background: "#1e1e2d" }}>Newest First</option>
            <option value="price-low" style={{ background: "#1e1e2d" }}>Price: Low → High</option>
            <option value="price-high" style={{ background: "#1e1e2d" }}>Price: High → Low</option>
          </select>
        </motion.div>

        {/* Status Message */}
        <AnimatePresence>
          {statusMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{
                background: statusMsg.includes("Error") ? "rgba(239,68,68,0.1)" : "rgba(139,92,246,0.1)",
                border: `1px solid ${statusMsg.includes("Error") ? "rgba(239,68,68,0.3)" : "rgba(139,92,246,0.3)"}`,
                borderRadius: "12px", padding: "12px 20px",
                color: statusMsg.includes("Error") ? "#f87171" : "#a78bfa",
                marginBottom: "16px", fontSize: "0.9rem", fontWeight: 500,
              }}
            >
              {statusMsg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State */}
        {filteredListings.length === 0 && (
          <motion.div variants={itemVariants} style={{
            textAlign: "center", padding: "80px 20px",
            background: "rgba(15,15,30,0.5)", border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: "20px",
          }}>
            <div style={{ fontSize: "3rem", marginBottom: "16px" }}>🏪</div>
            <h3 style={{ color: "#94a3b8", fontSize: "1.3rem", fontWeight: 700, marginBottom: "8px" }}>
              {filter === "sale" ? "No NFTs Listed for Sale" : "No NFTs Found"}
            </h3>
            <p style={{ color: "#475569", fontSize: "0.9rem" }}>
              {listings.length === 0
                ? "Mint some NFTs first, then list them here for sale!"
                : "Click 'List for Sale' on any NFT to sell it."}
            </p>
          </motion.div>
        )}

        {/* NFT Grid */}
        <motion.div
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "24px" }}
          variants={containerVariants}
        >
          {filteredListings.map((nft) => (
            <motion.div key={nft.id} className="market-card" variants={itemVariants}>
              {/* Image */}
              <div style={{ position: "relative", aspectRatio: "1", overflow: "hidden", background: "#0a0a15" }}>
                <img
                  src={nft.image}
                  alt={nft.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.5s ease" }}
                  onMouseEnter={(e) => (e.target.style.transform = "scale(1.08)")}
                  onMouseLeave={(e) => (e.target.style.transform = "scale(1)")}
                  onError={(e) => { e.target.src = "https://via.placeholder.com/400?text=NFT"; }}
                />
                {nft.listed && <span className="for-sale-badge">FOR SALE</span>}
                {nft.ownerFull === walletAddress && <span className="own-badge">YOURS</span>}
              </div>

              {/* Info */}
              <div style={{ padding: "16px" }}>
                <h3 style={{ color: "white", fontWeight: 700, fontSize: "1rem", marginBottom: "10px" }}>{nft.name}</h3>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                  <span className="price-tag">⭐ {nft.price} XLM</span>
                  <span style={{ color: "#64748b", fontSize: "0.75rem" }}>{nft.owner}</span>
                </div>

                {/* Buttons */}
                {nft.ownerFull === walletAddress ? (
                  <>
                    {!nft.listed ? (
                      <button className="list-btn" onClick={() => handleOpenListModal(nft)}>
                        🏷️ List for Sale
                      </button>
                    ) : (
                      <>
                        <button className="list-btn" onClick={() => handleOpenListModal(nft)}>
                          ✏️ Edit Price
                        </button>
                        <button className="unlist-btn" onClick={() => handleUnlist(nft.id)}>
                          ✕ Remove Listing
                        </button>
                      </>
                    )}
                  </>
                ) : nft.listed ? (
                  <button
                    className="buy-btn"
                    onClick={() => handleBuy(nft)}
                    disabled={buyingId === nft.id}
                  >
                    {buyingId === nft.id ? (
                      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                        <span style={{ width: "14px", height: "14px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block" }} />
                        Buying...
                      </span>
                    ) : `Buy for ${nft.price} XLM`}
                  </button>
                ) : (
                  <button disabled style={{
                    width: "100%", padding: "10px", borderRadius: "12px",
                    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                    color: "#475569", fontWeight: 600, cursor: "not-allowed", fontSize: "0.9rem",
                  }}>
                    Not for Sale
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* Success Popup */}
      <AnimatePresence>
        {successTx && (
          <motion.div className="success-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="success-card" initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }}>
              <div style={{ fontSize: "3rem", marginBottom: "16px" }}>🎉</div>
              <h2 style={{ color: "white", fontSize: "1.5rem", fontWeight: 800, marginBottom: "8px" }}>Purchase Successful!</h2>
              <p style={{ color: "#94a3b8", marginBottom: "20px" }}>
                You bought <strong style={{ color: "#a78bfa" }}>{successTx.nftName}</strong> for{" "}
                <strong style={{ color: "#a78bfa" }}>{successTx.price} XLM</strong>
              </p>
              <div style={{
                background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)",
                borderRadius: "12px", padding: "12px", marginBottom: "20px",
                wordBreak: "break-all", fontSize: "0.75rem", color: "#8b5cf6",
              }}>
                TX: {successTx.hash}
              </div>
              <div style={{ display: "flex", gap: "12px" }}>
                <a
                  href={`https://stellar.expert/explorer/testnet/tx/${successTx.hash}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{
                    flex: 1, padding: "10px", borderRadius: "12px", textAlign: "center",
                    background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)",
                    color: "#a78bfa", textDecoration: "none", fontWeight: 600, fontSize: "0.85rem",
                  }}
                >
                  View on Explorer
                </a>
                <button
                  onClick={() => setSuccessTx(null)}
                  style={{
                    flex: 1, padding: "10px", borderRadius: "12px",
                    background: "linear-gradient(135deg, #8b5cf6, #3b82f6)",
                    border: "none", color: "white", fontWeight: 700, cursor: "pointer",
                  }}
                >
                  Continue
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List for Sale Modal */}
      <AnimatePresence>
        {showListModal && selectedNft && (
          <motion.div className="success-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="success-card" initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }}>
              <div style={{ fontSize: "2rem", marginBottom: "12px" }}>🏷️</div>
              <h2 style={{ color: "white", fontSize: "1.4rem", fontWeight: 800, marginBottom: "8px" }}>
                {selectedNft.listed ? "Edit Price" : "List for Sale"}
              </h2>
              <p style={{ color: "#94a3b8", marginBottom: "20px" }}>
                <strong style={{ color: "#a78bfa" }}>{selectedNft.name}</strong>
              </p>
              <div style={{ marginBottom: "20px", textAlign: "left" }}>
                <label style={{ color: "#94a3b8", fontSize: "0.85rem", display: "block", marginBottom: "8px" }}>
                  Price in XLM
                </label>
                <input
                  type="number"
                  value={listPrice}
                  onChange={(e) => setListPrice(e.target.value)}
                  placeholder="Enter price (e.g. 10)"
                  min="0.1"
                  step="0.1"
                  style={{
                    width: "100%", padding: "12px 16px", borderRadius: "12px",
                    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                    color: "white", fontSize: "1rem", outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  onClick={() => { setShowListModal(false); setSelectedNft(null); }}
                  style={{
                    flex: 1, padding: "12px", borderRadius: "12px",
                    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                    color: "#94a3b8", cursor: "pointer", fontWeight: 600,
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmListing}
                  style={{
                    flex: 1, padding: "12px", borderRadius: "12px",
                    background: "linear-gradient(135deg, #8b5cf6, #3b82f6)",
                    border: "none", color: "white", fontWeight: 700, cursor: "pointer",
                  }}
                >
                  {selectedNft.listed ? "Update Price" : "List Now"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}