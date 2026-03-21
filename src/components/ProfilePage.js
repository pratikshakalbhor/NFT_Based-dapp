import React, { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import { useWallet } from "../WalletContext";
import { ref, onValue } from "firebase/database";
import { db } from "../firebase";
import { 
  Copy, 
  Check, 
  Wallet, 
  LayoutGrid, 
  History, 
  CreditCard, 
  Image as ImageIcon,
  Tag,
  ShoppingBag
} from "lucide-react";
import { shortenAddress } from "../utils";
import { motion } from "framer-motion";


export const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

export const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1,
    transition: { type: "spring", stiffness: 300, damping: 24 }
  }
};

const ProfilePage = ({ account, nfts: propNfts }) => {
  const { isDark } = useTheme();
  const { walletAddress } = useWallet();
  
  const [activeTab, setActiveTab] = useState("overview");
  const [copied, setCopied] = useState(false);
  const [soldCount, setSoldCount] = useState(0);
  const [purchasedCount, setPurchasedCount] = useState(0);
  const [marketHistory, setMarketHistory] = useState([]);
  const [xlmBalance, setXlmBalance] = useState("0");

  useEffect(() => {
    if (!walletAddress) return;

    // 1. Get Balance
    if (account) {
      const native = account.balances.find(b => b.asset_type === "native");
      if (native) setXlmBalance(parseFloat(native.balance).toFixed(2));
    }

    // 2. Fetch Firebase History
    const marketRef = ref(db, "marketplace");
    const unsubscribe = onValue(marketRef, (snap) => {
      const data = snap.val() || {};
      const history = [];
      let sCount = 0;
      let pCount = 0;

      Object.values(data).forEach(item => {
        // Sold items
        if (item.sold && item.previousOwner === walletAddress) {
          sCount++;
          history.push({ ...item, actionType: "sold", date: item.soldAt });
        }
        // Purchased items
        if (item.sold && item.ownerFull === walletAddress) {
          pCount++;
          history.push({ ...item, actionType: "bought", date: item.soldAt });
        }
      });

      setSoldCount(sCount);
      setPurchasedCount(pCount);
      setMarketHistory(history.sort((a, b) => b.date - a.date));
    });

    return () => unsubscribe();
  }, [walletAddress, account]);

  const handleCopy = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const tabButtonStyle = (key) => ({
    padding: "10px 24px",
    background: "transparent",
    border: "none",
    borderBottom: activeTab === key 
      ? `2px solid ${isDark ? "#a78bfa" : "#6366f1"}` 
      : "2px solid transparent",
    color: activeTab === key 
      ? (isDark ? "#fff" : "#0f172a") 
      : (isDark ? "#64748b" : "#94a3b8"),
    fontWeight: activeTab === key ? 700 : 500,
    cursor: "pointer",
    fontSize: "0.95rem",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    transition: "all 0.2s",
  });

  const statCardStyle = {
    background: isDark ? "rgba(255,255,255,0.04)" : "#fff",
    border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)",
    borderRadius: "14px",
    padding: "20px",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "120px",
  };

  if (!walletAddress) return <div style={{ padding: "40px", textAlign: "center" }}>Please connect wallet</div>;

  return (
    <motion.div 
      className="main-content" 
      style={{ padding: "2rem", maxWidth: "1000px", margin: "0 auto", color: isDark ? "#e2e8f0" : "#1e293b" }}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      
      {/* Header Section */}
      <motion.div variants={itemVariants} style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 800, margin: "0 0 8px", color: isDark ? "#fff" : "#0f172a" }}>Profile</h1>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            background: isDark ? "rgba(99, 102, 241, 0.1)" : "#eff6ff",
            color: isDark ? "#818cf8" : "#3b82f6",
            padding: "6px 12px",
            borderRadius: "8px",
            fontFamily: "monospace",
            fontSize: "0.9rem",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            <Wallet size={16} />
            {shortenAddress(walletAddress)}
          </div>
          <button 
            onClick={handleCopy}
            style={{
              background: "transparent",
              border: isDark ? "1px solid rgba(255,255,255,0.2)" : "1px solid #cbd5e1",
              borderRadius: "8px",
              padding: "6px",
              cursor: "pointer",
              color: isDark ? "#cbd5e1" : "#64748b",
              display: "flex",
              alignItems: "center"
            }}
            title="Copy Address"
          >
            {copied ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
          </button>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={itemVariants} style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
        gap: "16px", 
        marginBottom: "40px" 
      }}>
        {/* Balance */}
        <div style={statCardStyle}>
          <div style={{ 
            width: "48px", height: "48px", borderRadius: "50%", 
            background: isDark ? "rgba(99, 102, 241, 0.15)" : "#eff6ff",
            color: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px" 
          }}>
            <CreditCard size={24} />
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: isDark ? "#fff" : "#0f172a" }}>
            {xlmBalance}
          </div>
          <div style={{ fontSize: "0.8rem", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)", marginTop: "4px" }}>
            XLM Balance
          </div>
        </div>

        {/* Owned */}
        <div style={statCardStyle}>
          <div style={{ 
            width: "48px", height: "48px", borderRadius: "50%", 
            background: isDark ? "rgba(16, 185, 129, 0.15)" : "#ecfdf5",
            color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px" 
          }}>
            <ImageIcon size={24} />
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: isDark ? "#fff" : "#0f172a" }}>
            {propNfts ? propNfts.length : 0}
          </div>
          <div style={{ fontSize: "0.8rem", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)", marginTop: "4px" }}>
            NFTs Owned
          </div>
        </div>

        {/* Sold */}
        <div style={statCardStyle}>
          <div style={{ 
            width: "48px", height: "48px", borderRadius: "50%", 
            background: isDark ? "rgba(245, 158, 11, 0.15)" : "#fffbeb",
            color: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px" 
          }}>
            <Tag size={24} />
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: isDark ? "#fff" : "#0f172a" }}>
            {soldCount}
          </div>
          <div style={{ fontSize: "0.8rem", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)", marginTop: "4px" }}>
            NFTs Sold
          </div>
        </div>

        {/* Purchased */}
        <div style={statCardStyle}>
          <div style={{ 
            width: "48px", height: "48px", borderRadius: "50%", 
            background: isDark ? "rgba(236, 72, 153, 0.15)" : "#fdf2f8",
            color: "#ec4899", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px" 
          }}>
            <ShoppingBag size={24} />
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: isDark ? "#fff" : "#0f172a" }}>
            {purchasedCount}
          </div>
          <div style={{ fontSize: "0.8rem", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)", marginTop: "4px" }}>
            NFTs Purchased
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={itemVariants} style={{ borderBottom: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #e2e8f0", marginBottom: "24px" }}>
        <div style={{ display: "flex", gap: "8px" }}>
          <button style={tabButtonStyle("overview")} onClick={() => setActiveTab("overview")}>
            <LayoutGrid size={16} /> Overview
          </button>
          <button style={tabButtonStyle("nfts")} onClick={() => setActiveTab("nfts")}>
            <ImageIcon size={16} /> My NFTs
          </button>
          <button style={tabButtonStyle("history")} onClick={() => setActiveTab("history")}>
            <History size={16} /> History
          </button>
        </div>
      </motion.div>

      {/* Tab Content */}
      <div style={{ minHeight: "300px" }}>
        
        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <motion.div variants={itemVariants} style={{ color: isDark ? "#94a3b8" : "#64748b" }}>
            <h3 style={{ color: isDark ? "#fff" : "#0f172a", marginTop: 0 }}>Wallet Details</h3>
            <div style={{ 
              background: isDark ? "rgba(255,255,255,0.03)" : "#f8fafc",
              padding: "20px", 
              borderRadius: "12px", 
              border: isDark ? "1px solid rgba(255,255,255,0.05)" : "1px solid #e2e8f0" 
            }}>
              <p style={{ margin: "0 0 10px" }}><strong>Network:</strong> Testnet</p>
              <p style={{ margin: "0 0 10px" }}><strong>Sequence Number:</strong> {account?.sequence || "Loading..."}</p>
              <p style={{ margin: 0 }}><strong>Subentry Count:</strong> {account?.subentry_count || 0}</p>
            </div>
          </motion.div>
        )}

        {/* MY NFTS TAB */}
        {activeTab === "nfts" && (
          <motion.div variants={containerVariants} initial="hidden" animate="visible" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "20px" }}>
            {propNfts && propNfts.length > 0 ? (
              propNfts.map((nft) => (
                <motion.div key={nft.id} variants={itemVariants} style={{ 
                  background: isDark ? "rgba(30, 41, 59, 0.4)" : "#fff",
                  border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)",
                  borderRadius: "12px",
                  overflow: "hidden",
                  transition: "transform 0.2s",
                }}>
                  <div style={{ 
                    height: "200px", 
                    background: isDark ? "#0f172a" : "#f1f5f9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)",
                    fontSize: "3rem"
                  }}>
                    {nft.image ? (
                        <img src={nft.image} alt={nft.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : "🖼️"}
                  </div>
                  <div style={{ padding: "16px" }}>
                    <h4 style={{ margin: "0 0 4px", color: isDark ? "#fff" : "#0f172a", fontSize: "1rem" }}>{nft.name || `NFT #${nft.id}`}</h4>
                    <span style={{ fontSize: "0.75rem", color: "#6366f1", background: "rgba(99, 102, 241, 0.1)", padding: "2px 8px", borderRadius: "4px" }}>
                      ID: {nft.id.toString().slice(0,8)}...
                    </span>
                  </div>
                </motion.div>
              ))
            ) : (
              <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "40px", opacity: 0.6 }}>
                No NFTs found in this wallet.
              </div>
            )}
          </motion.div>
        )}

        {/* HISTORY TAB */}
        {activeTab === "history" && (
          <motion.div variants={containerVariants} initial="hidden" animate="visible" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {marketHistory.length > 0 ? (
              marketHistory.map((item, i) => (
                <motion.div key={i} variants={itemVariants} style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  padding: "16px",
                  background: isDark ? "rgba(255,255,255,0.03)" : "#fff",
                  border: isDark ? "1px solid rgba(255,255,255,0.05)" : "1px solid #e2e8f0",
                  borderRadius: "12px"
                }}>
                  <div style={{ 
                    padding: "10px", 
                    borderRadius: "50%", 
                    background: item.actionType === "bought" ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)",
                    color: item.actionType === "bought" ? "#10b981" : "#f59e0b",
                    marginRight: "16px"
                  }}>
                    {item.actionType === "bought" ? <ShoppingBag size={20} /> : <Tag size={20} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: isDark ? "#fff" : "#0f172a" }}>
                      {item.actionType === "bought" ? "Purchased NFT" : "Sold NFT"}
                    </div>
                    <div style={{ fontSize: "0.85rem", color: isDark ? "#94a3b8" : "#64748b" }}>
                      {item.name} for <strong>{item.price} XLM</strong>
                    </div>
                  </div>
                  <div style={{ fontSize: "0.8rem", color: isDark ? "#64748b" : "#94a3b8" }}>
                    {new Date(item.soldAt).toLocaleDateString()}
                  </div>
                </motion.div>
              ))
            ) : (
              <div style={{ textAlign: "center", padding: "40px", opacity: 0.6 }}>
                No transaction history found.
              </div>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

// ── Exported Icons (used by MintPage, PaymentPage) ──────────────────────────
export const CheckIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
  </svg>
);

export const CopyIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
  </svg>
);

export const XLMIcon = ({ className, style }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
    <path d="M12 7v10M7 12h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export default ProfilePage;
