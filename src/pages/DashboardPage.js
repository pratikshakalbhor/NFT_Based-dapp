import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import * as StellarSdk from "@stellar/stellar-sdk";
import { HORIZON_URL } from "../constants";
import { useTheme } from "../context/ThemeContext";

const shortenAddr = (addr) => {
  if (!addr || typeof addr !== "string") return "";
  return `${addr.slice(0, 6)}...${addr.slice(-5)}`;
};

export default function DashboardPage({ walletAddress, balance, nfts, jobs }) {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [recentTxs, setRecentTxs] = useState([]);
  const [txLoading, setTxLoading] = useState(true);

  const cardStyle = {
    background: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.8)",
    border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)",
    borderRadius: "16px",
    padding: "24px",
    boxShadow: isDark ? "none" : "0 4px 12px rgba(0,0,0,0.05)"
  };

  const StatCard = ({ icon, label, value, color, delay }) => (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      style={{
        ...cardStyle,
        display: "flex",
        alignItems: "center",
        gap: "16px",
        flex: "1 1 200px",
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
        <div style={{ color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.5)", fontSize: "0.85rem", marginBottom: "4px" }}>{label}</div>
        <div style={{ color: isDark ? "#fff" : "#1a1a2e", fontSize: "1.5rem", fontWeight: 700 }}>{value}</div>
      </div>
    </motion.div>
  );

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
      icon: "💰",
      label: "XLM Balance",
      value: `${balance} XLM`,
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
      icon: "💼",
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
      label: "Post a Job",
      to: "/escrow",
    },
    {
      icon: "🖼️",
      label: "Mint NFT",
      to: "/mint",
    },
    {
      icon: "🏪",
      label: "Marketplace",
      to: "/marketplace",
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
      style={{ maxWidth: "1200px", margin: "0 auto", padding: "8px" }}
    >
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <motion.h1
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          style={{
            color: isDark ? "#fff" : "#1a1a2e",
            fontSize: "2rem",
            fontWeight: 700,
            marginBottom: "8px",
            background: "none",
          }}
        >
          Overview
        </motion.h1>
        <p style={{ color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)", fontSize: "0.95rem" }}>
          Welcome back, <span style={{ fontFamily: "monospace", color: isDark ? "#a78bfa" : "#7c3aed" }}>{shortenAddr(walletAddress)}</span>
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "20px", marginBottom: "32px" }}>
        {stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "24px" }}>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          style={{ flex: "1 1 400px" }}
        >
          <div style={{ ...cardStyle, height: "100%" }}>
            <h2 style={{ color: isDark ? "#fff" : "#1a1a2e", fontSize: "1.2rem", fontWeight: 700, marginBottom: "20px" }}>⚡ Quick Actions</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {actions.map((a) => (
                <motion.button
                  key={a.to}
                  whileHover={{
                    scale: 1.02, x: 4,
                    background: isDark ? "rgba(99,102,241,0.25)" : "rgba(99,102,241,0.15)"
                  }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(a.to)}
                  style={{
                    padding: "16px 20px",
                    background: isDark ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.08)",
                    border: "1px solid rgba(99,102,241,0.3)",
                    borderRadius: "14px",
                    color: isDark ? "#fff" : "#1a1a2e",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    fontWeight: 700,
                    fontSize: "1rem",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                  }}
                >
                  <span style={{ fontSize: "24px" }}>{a.icon}</span>
                  {a.label}
                  <span style={{ marginLeft: "auto" }}>→</span>
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{ flex: "1 1 400px" }}
        >
          <div style={{ ...cardStyle, height: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ color: isDark ? "#fff" : "#1a1a2e", fontSize: "1.2rem", fontWeight: 700 }}>📋 Recent Transactions</h2>
              <button
                onClick={() => navigate("/activity")}
                style={{
                  background: "transparent",
                  border: isDark ? "1px solid rgba(124,58,237,0.3)" : "1px solid rgba(124,58,237,0.5)",
                  borderRadius: "8px",
                  color: isDark ? "#a78bfa" : "#6d28d9",
                  padding: "6px 14px",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  fontWeight: 600,
                  transition: "all 0.2s"
                }}
                onMouseEnter={e => e.target.style.background = isDark ? "rgba(124,58,237,0.15)" : "rgba(124,58,237,0.1)"}
                onMouseLeave={e => e.target.style.background = "transparent"}
              >
                View All
              </button>
            </div>

            {txLoading ? (
              <div style={{ textAlign: "center", padding: "32px", color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)" }}>⏳ Loading network activity...</div>
            ) : recentTxs.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px", color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)" }}>No transactions found for this address.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {recentTxs.map((tx, i) => (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.35 + i * 0.05 }}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "16px",
                      background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
                      border: isDark ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(0,0,0,0.05)",
                      borderRadius: "12px",
                      flexWrap: "wrap",
                      gap: "12px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                      <div style={{
                        width: "40px", height: "40px", borderRadius: "10px",
                        background: tx.successful ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                        color: tx.successful ? "#10b981" : "#ef4444",
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px",
                      }}>
                        {tx.successful ? "⚡" : "⚠️"}
                      </div>
                      <div>
                        <div style={{ color: isDark ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.8)", fontSize: "0.9rem", fontFamily: "monospace", letterSpacing: "1px" }}>
                          {shortenAddr(tx.id)}
                        </div>
                        <div style={{ color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.5)", fontSize: "0.8rem", marginTop: "2px" }}>
                          {formatDate(tx.created_at)}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
}
