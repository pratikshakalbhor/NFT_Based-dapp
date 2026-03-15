import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import * as StellarSdk from "@stellar/stellar-sdk";
import { HORIZON_URL } from "../constants";

const shortenAddr = (addr) => {
  if (!addr || typeof addr !== "string") return "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
};

const card = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "20px",
  padding: "24px",
};

const StatCard = ({ icon, label, value, color, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    style={{
      ...card,
      display: "flex",
      alignItems: "center",
      gap: "16px",
      flex: "1 1 180px",
    }}
  >
    <div style={{
      width: "52px", height: "52px", borderRadius: "16px",
      background: color, display: "flex", alignItems: "center",
      justifyContent: "center", fontSize: "24px", flexShrink: 0,
    }}>
      {icon}
    </div>
    <div>
      <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.78rem", marginBottom: "4px" }}>{label}</div>
      <div style={{ color: "#fff", fontSize: "1.3rem", fontWeight: 700 }}>{value}</div>
    </div>
  </motion.div>
);

export default function DashboardPage({ walletAddress, balance, nfts, jobs }) {
  const navigate = useNavigate();
  const [recentTxs, setRecentTxs] = useState([]);
  const [txLoading, setTxLoading] = useState(true);

  // Derive job counts from jobs prop
  const jobsPosted = jobs ? jobs.filter(j => j.client === walletAddress).length : 0;
  const jobsCompleted = jobs ? jobs.filter(j => {
    const s = Array.isArray(j.status) ? j.status[0] : j.status;
    return (typeof s === "number" && s === 3) ||
      (typeof s === "string" && s === "Completed") ||
      (typeof s === "object" && s !== null && Object.keys(s)[0] === "Completed");
  }).length : 0;

  useEffect(() => {
    if (!walletAddress) return;
    const fetchTxs = async () => {
      try {
        setTxLoading(true);
        const server = new StellarSdk.Horizon.Server(HORIZON_URL);
        const { records } = await server.transactions()
          .forAccount(walletAddress).limit(5).order("desc").call();
        setRecentTxs(records.slice(0, 3));
      } catch (e) {
        console.error("Dashboard tx error:", e);
      } finally {
        setTxLoading(false);
      }
    };
    fetchTxs();
  }, [walletAddress]);

  const stats = [
    {
      icon: "👤",
      label: "Wallet",
      value: shortenAddr(walletAddress),
      color: "rgba(124,58,237,0.25)",
      delay: 0.05,
    },
    {
      icon: "🖼️",
      label: "Total NFTs",
      value: nfts?.length ?? 0,
      color: "rgba(59,130,246,0.25)",
      delay: 0.1,
    },
    {
      icon: "📝",
      label: "Jobs Posted",
      value: jobsPosted,
      color: "rgba(234,179,8,0.25)",
      delay: 0.15,
    },
    {
      icon: "✅",
      label: "Jobs Completed",
      value: jobsCompleted,
      color: "rgba(16,185,129,0.25)",
      delay: 0.2,
    },
  ];

  const actions = [
    {
      icon: "🤝",
      label: "Go to Escrow",
      to: "/escrow",
      gradient: "linear-gradient(135deg,#7c3aed,#4f46e5)",
    },
    {
      icon: "🛒",
      label: "Go to Marketplace",
      to: "/marketplace",
      gradient: "linear-gradient(135deg,#0891b2,#0e7490)",
    },
    {
      icon: "🎨",
      label: "Mint NFT",
      to: "/mint",
      gradient: "linear-gradient(135deg,#059669,#047857)",
    },
  ];

  const formatDate = (d) => {
    try {
      return new Date(d).toLocaleDateString(undefined, {
        month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    } catch { return d; }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ maxWidth: "960px", margin: "0 auto", padding: "20px 16px" }}
    >
      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <motion.h1
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          style={{
            fontSize: "clamp(1.6rem,4vw,2.2rem)",
            fontWeight: 800,
            background: "linear-gradient(135deg,#a78bfa,#60a5fa)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            marginBottom: "4px",
          }}
        >
          👋 Dashboard
        </motion.h1>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.82rem", fontFamily: "monospace" }}>
          {walletAddress}
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "14px", marginBottom: "24px" }}>
        {stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Balance Banner */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
        style={{
          ...card,
          marginBottom: "24px",
          background: "linear-gradient(135deg,rgba(124,58,237,0.18),rgba(79,70,229,0.12))",
          border: "1px solid rgba(124,58,237,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.8rem", marginBottom: "4px" }}>XLM Balance</div>
          <div style={{ color: "#a78bfa", fontSize: "2rem", fontWeight: 800 }}>{balance} <span style={{ fontSize: "1rem" }}>XLM</span></div>
        </div>
        <div style={{ fontSize: "48px" }}>💎</div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        style={{ ...card, marginBottom: "24px" }}
      >
        <h2 style={{ color: "#fff", fontSize: "1rem", fontWeight: 700, marginBottom: "16px" }}>⚡ Quick Actions</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "14px" }}>
          {actions.map((a) => (
            <motion.button
              key={a.to}
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate(a.to)}
              style={{
                flex: "1 1 140px",
                padding: "20px 12px",
                background: a.gradient,
                border: "none",
                borderRadius: "16px",
                color: "#fff",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "10px",
                fontWeight: 700,
                fontSize: "0.9rem",
                boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
              }}
            >
              <span style={{ fontSize: "28px" }}>{a.icon}</span>
              {a.label}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.38 }}
        style={card}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 style={{ color: "#fff", fontSize: "1rem", fontWeight: 700 }}>📋 Recent Transactions</h2>
          <button
            onClick={() => navigate("/activity")}
            style={{
              background: "rgba(124,58,237,0.15)",
              border: "1px solid rgba(124,58,237,0.3)",
              borderRadius: "10px",
              color: "#a78bfa",
              padding: "5px 12px",
              fontSize: "0.78rem",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            View All →
          </button>
        </div>

        {txLoading ? (
          <div style={{ textAlign: "center", padding: "24px", color: "rgba(255,255,255,0.3)" }}>⏳ Loading...</div>
        ) : recentTxs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "24px", color: "rgba(255,255,255,0.3)" }}>No transactions found.</div>
        ) : recentTxs.map((tx, i) => (
          <motion.div
            key={tx.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.42 + i * 0.06 }}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px",
              background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent",
              borderRadius: "10px",
              marginBottom: "6px",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{
                width: "34px", height: "34px", borderRadius: "10px",
                background: "rgba(124,58,237,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px",
              }}>⚡</div>
              <div>
                <div style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.8rem", fontFamily: "monospace" }}>
                  {shortenAddr(tx.id)}
                </div>
                <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.7rem" }}>
                  {formatDate(tx.created_at)}
                </div>
              </div>
            </div>
            <div style={{
              background: tx.successful ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
              color: tx.successful ? "#34d399" : "#f87171",
              border: `1px solid ${tx.successful ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}`,
              borderRadius: "20px", padding: "3px 10px",
              fontSize: "0.72rem", fontWeight: 600,
            }}>
              {tx.successful ? "✓ Success" : "✗ Failed"}
            </div>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}
