import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { getImageById } from "../utils/imageMap";
import { containerVariants, itemVariants } from "../components/ProfilePageAnimations";
import "./GalleryPage.css";

export default function GalleryPage({ nfts }) {
  const navigate = useNavigate();

  // ✅ Fix 1: Duplicate remove करा
  const uniqueNfts = nfts ? nfts.filter((nft, index, self) =>
    index === self.findIndex((n) =>
      n.name === nft.name &&
      (n.imageId || n.image) === (nft.imageId || nft.image)
    )
  ) : [];

  const isEmpty = uniqueNfts.length === 0;

  return (
    <div className="min-h-screen">
      <motion.div
        className="max-w-6xl mx-auto p-8 space-y-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div className="gallery-header" variants={itemVariants}>
          <h1 className="heading-xl">My NFT Collection</h1>
          <p className="subtext">Your minted digital assets on Stellar.</p>
        </motion.div>

        {/* NFT Count Badge */}
        {!isEmpty && (
          <motion.div variants={itemVariants}>
            <span style={{
              background: "rgba(139, 92, 246, 0.15)",
              border: "1px solid rgba(139, 92, 246, 0.3)",
              color: "#a78bfa",
              padding: "6px 16px",
              borderRadius: "999px",
              fontSize: "0.85rem",
              fontWeight: "600",
            }}>
              {uniqueNfts.length} NFT{uniqueNfts.length > 1 ? "s" : ""} Minted
            </span>
          </motion.div>
        )}

        {isEmpty ? (
          <motion.div
            className="card flex flex-col items-center justify-center text-center"
            variants={itemVariants}
          >
            <div style={{
              width: "80px", height: "80px", borderRadius: "50%",
              background: "rgba(255,255,255,0.05)", display: "flex",
              alignItems: "center", justifyContent: "center", marginBottom: "16px"
            }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
            <h3 style={{ fontSize: "1.5rem", fontWeight: "700", color: "#e2e8f0", margin: "0 0 8px 0" }}>
              No NFTs Minted Yet
            </h3>
            <p style={{ color: "#94a3b8", margin: "0 0 24px 0" }}>
              Start your collection by minting your first digital asset.
            </p>
            <button onClick={() => navigate('/mint')} className="btn-primary mt-6">
              Mint Your First NFT
            </button>
          </motion.div>
        ) : (
          <motion.div
            className="gallery-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={containerVariants}
          >
            {uniqueNfts.map((nft, index) => {

              // ✅ Fix 2: IPFS URL असेल तर directly वापरा
              const imageId = nft.imageId || nft.image || "";
              const imageSrc =
                imageId.startsWith("https://") || imageId.startsWith("ipfs://")
                  ? imageId
                  : getImageById(imageId.toUpperCase()) ||
                    "https://via.placeholder.com/200?text=No+Image";

              // Badge साठी short label
              const imageKey = imageId.startsWith("https://")
                ? "IPFS"
                : imageId.toUpperCase();

              return (
                <motion.div
                  key={`${nft.name}-${index}`}
                  className="relative flex justify-center mt-8"
                  variants={itemVariants}
                >
                  {/* Gradient Glow */}
                  <div className="
                    absolute top-1/2 left-1/2
                    -translate-x-1/2 -translate-y-[40%]
                    w-[500px] h-[500px]
                    bg-gradient-to-br from-purple-600/40 via-pink-500/20 to-blue-500/30
                    rounded-full blur-[180px] opacity-70 z-0
                  "></div>

                  {/* Card */}
                  <motion.div
                    className="relative z-10 w-[380px] card"
                    whileHover={{ y: -5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <div className="nft-image-container">
                      <img
                        src={imageSrc}
                        alt={nft.name || "NFT"}
                        className="nft-image"
                        loading="lazy"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "https://via.placeholder.com/200?text=Image+Error";
                        }}
                      />
                    </div>

                    <div className="nft-info">
                      <h3 className="nft-name" title={nft.name || "Unnamed NFT"}>
                        {nft.name || "Unnamed NFT"}
                      </h3>
                      <div className="nft-meta">
                        <span className="nft-badge">#{imageKey}</span>
                        <span>Stellar Network</span>
                      </div>

                      {/* IPFS Link */}
                      {imageId.startsWith("https://") && (
                        <a
                          href={imageId}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "block",
                            marginTop: "8px",
                            fontSize: "0.7rem",
                            color: "#8b5cf6",
                            textDecoration: "none",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          🔗 View on IPFS
                        </a>
                      )}

                      <button
                        onClick={() => navigate('/marketplace')}
                        style={{
                          marginTop: "12px",
                          width: "100%",
                          padding: "10px",
                          background: "linear-gradient(135deg, #8b5cf6, #3b82f6)",
                          border: "none",
                          borderRadius: "12px",
                          color: "white",
                          fontWeight: 700,
                          cursor: "pointer",
                          fontSize: "0.85rem",
                        }}
                      >
                        List for Sale →
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}