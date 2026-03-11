import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { shortenAddress } from "../utils";
import * as StellarSdk from "@stellar/stellar-sdk";

const HORIZON_URL = "https://horizon-testnet.stellar.org";

const getActivityInfo = (tx, walletAddress) => {
  const ops = tx.operations || [];
  const op = ops[0] || {};

  if (op.type === "invoke_host_function") {
    const isSuccess = tx.successful;
    return {
      type: "MINT",
      label: isSuccess ? "NFT Minted" : "Mint Failed",
      description: isSuccess ? "You minted a new NFT on Stellar" : "Mint attempt failed",
      icon: isSuccess ? "✦" : "✕",
      gradient: isSuccess ? "linear-gradient(135deg, #8b5cf6, #6d28d9)" : "linear-gradient(135deg, #ef4444, #dc2626)",
      glow: isSuccess ? "rgba(139, 92, 246, 0.4)" : "rgba(239, 68, 68, 0.4)",
      textColor: isSuccess ? "#c4b5fd" : "#fca5a5",
      bgColor: isSuccess ? "rgba(139, 92, 246, 0.08)" : "rgba(239, 68, 68, 0.08)",
      borderColor: isSuccess ? "rgba(139, 92, 246, 0.2)" : "rgba(239, 68, 68, 0.2)",
    };
  }
  if (op.type === "payment") {
    const isSend = op.from === walletAddress;
    return {
      type: isSend ? "SEND" : "RECEIVE",
      label: isSend ? "Payment Sent" : "Payment Received",
      description: isSend
        ? `Sent ${parseFloat(op.amount || 0).toFixed(2)} XLM to ${shortenAddress(op.to)}`
        : `Received ${parseFloat(op.amount || 0).toFixed(2)} XLM from ${shortenAddress(op.from)}`,
      icon: isSend ? "↑" : "↓",
      gradient: isSend
        ? "linear-gradient(135deg, #f59e0b, #d97706)"
        : "linear-gradient(135deg, #10b981, #059669)",
      glow: isSend ? "rgba(245, 158, 11, 0.4)" : "rgba(16, 185, 129, 0.4)",
      textColor: isSend ? "#fcd34d" : "#6ee7b7",
      bgColor: isSend ? "rgba(245, 158, 11, 0.08)" : "rgba(16, 185, 129, 0.08)",
      borderColor: isSend ? "rgba(245, 158, 11, 0.2)" : "rgba(16, 185, 129, 0.2)",
      amount: `${isSend ? "-" : "+"}${parseFloat(op.amount || 0).toFixed(2)} XLM`,
    };
  }
  if (op.type === "create_account") {
    return {
      type: "CREATE",
      label: "Account Funded",
      description: `Account created with ${parseFloat(op.starting_balance || 0).toFixed(2)} XLM`,
      icon: "★",
      gradient: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
      glow: "rgba(59, 130, 246, 0.4)",
      textColor: "#93c5fd",
      bgColor: "rgba(59, 130, 246, 0.08)",
      borderColor: "rgba(59, 130, 246, 0.2)",
    };
  }
  if (op.type === "change_trust") {
    return {
      type: "TRUST",
      label: "Trustline Added",
      description: `Added trustline for ${op.asset_code || "asset"}`,
      icon: "⬡",
      gradient: "linear-gradient(135deg, #06b6d4, #0891b2)",
      glow: "rgba(6, 182, 212, 0.4)",
      textColor: "#67e8f9",
      bgColor: "rgba(6, 182, 212, 0.08)",
      borderColor: "rgba(6, 182, 212, 0.2)",
    };
  }
  return {
    type: "TX",
    label: "Transaction",
    description: "Blockchain transaction",
    icon: "⚡",
    gradient: "linear-gradient(135deg, #6366f1, #4f46e5)",
    glow: "rgba(99, 102, 241, 0.4)",
    textColor: "#a5b4fc",
    bgColor: "rgba(99, 102, 241, 0.08)",
    borderColor: "rgba(99, 102, 241, 0.2)",
  };
};

const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export default function ActivityPage({ walletAddress }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const fetchActivity = async () => {
      if (!walletAddress) { setLoading(false); return; }
      setLoading(true);
      try {
        const server = new StellarSdk.Horizon.Server(HORIZON_URL);
        const txPage = await server.transactions()
          .forAccount(walletAddress)
          .limit(20)
          .order("desc")
          .call();

        const txsWithOps = await Promise.all(
          txPage.records.map(async (tx) => {
            try {
              const opsPage = await tx.operations();
              return { ...tx, operations: opsPage.records };
            } catch {
              return { ...tx, operations: [] };
            }
          })
        );
        setActivities(txsWithOps);
      } catch (e) {
        console.error("Failed to fetch activity:", e);
        setActivities([]);
      } finally {
        setLoading(false);
      }
    };
    fetchActivity();
  }, [walletAddress]);

  const filtered = activities.filter((tx) => {
    if (filter === "all") return true;
    const { type } = getActivityInfo(tx, walletAddress);
    if (filter === "mint") return type === "MINT";
    if (filter === "payment") return type === "SEND" || type === "RECEIVE";
    return true;
  });

  const stats = {
    total: activities.length,
    mints: activities.filter((tx) => getActivityInfo(tx, walletAddress).type === "MINT" && tx.successful).length,
    payments: activities.filter((tx) => {
      const { type } = getActivityInfo(tx, walletAddress);
      return type === "SEND" || type === "RECEIVE";
    }).length,
  };

  return (
    <div style={{ minHeight: "100vh", padding: "2rem 1rem", fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        .activity-row {
          background: rgba(12, 12, 25, 0.7);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 18px;
          padding: 20px 24px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          backdrop-filter: blur(20px);
          position: relative;
          overflow: hidden;
        }
        .activity-row::before {
          content: '';
          position: absolute;
          inset: 0;
          opacity: 0;
          transition: opacity 0.3s ease;
          border-radius: inherit;
        }
        .activity-row:hover {
          border-color: rgba(139, 92, 246, 0.25);
          transform: translateX(6px);
          box-shadow: -4px 0 20px rgba(139, 92, 246, 0.1), 0 8px 30px rgba(0,0,0,0.3);
        }
        .activity-row:hover::before { opacity: 1; }

        .icon-ring {
          width: 52px; height: 52px; border-radius: 16px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.3rem; font-weight: 900; flex-shrink: 0;
          position: relative;
        }
        .icon-ring::after {
          content: '';
          position: absolute; inset: -1px;
          border-radius: inherit;
          padding: 1px;
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
        }

        .filter-pill {
          padding: 8px 20px; border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.03);
          color: #64748b; font-size: 0.82rem; font-weight: 600;
          cursor: pointer; transition: all 0.2s ease;
          letter-spacing: 0.02em;
        }
        .filter-pill:hover { color: #94a3b8; border-color: rgba(255,255,255,0.15); }
        .filter-pill.active {
          background: rgba(139,92,246,0.15);
          border-color: rgba(139,92,246,0.35); color: #c4b5fd;
        }

        .stat-card {
          background: rgba(12,12,25,0.6);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px; padding: 16px 24px;
          text-align: center; flex: 1;
          backdrop-filter: blur(16px);
          transition: all 0.2s ease;
        }
        .stat-card:hover {
          border-color: rgba(139,92,246,0.2);
          background: rgba(139,92,246,0.05);
        }

        .tx-hash-box {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 10px; padding: 10px 14px;
          font-family: 'Courier New', monospace;
          font-size: 0.75rem; color: #475569;
          word-break: break-all; margin-top: 12px;
          transition: all 0.2s;
        }
        .tx-hash-box:hover { color: #8b5cf6; border-color: rgba(139,92,246,0.2); }

        .explorer-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 7px 16px; border-radius: 10px;
          background: rgba(139,92,246,0.1); border: 1px solid rgba(139,92,246,0.25);
          color: #a78bfa; text-decoration: none; font-size: 0.8rem; font-weight: 600;
          transition: all 0.2s ease; margin-top: 12px;
        }
        .explorer-btn:hover {
          background: rgba(139,92,246,0.2); border-color: rgba(139,92,246,0.4);
          transform: translateY(-1px);
        }

        .success-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

        @keyframes shimmer {
          0% { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        .skeleton {
          background: linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 100%);
          background-size: 400px 100%;
          animation: shimmer 1.6s ease-in-out infinite;
          border-radius: 10px;
        }

        .connector-line {
          position: absolute; left: 50px; top: 80px; bottom: -16px;
          width: 1px;
          background: linear-gradient(to bottom, rgba(139,92,246,0.2) 0%, transparent 100%);
        }
      `}</style>

      <motion.div
        className="max-w-2xl mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div style={{ marginBottom: "32px" }}>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            style={{ fontSize: "2.8rem", fontWeight: 800, color: "white", marginBottom: "6px", letterSpacing: "-0.03em" }}
          >
            Activity{" "}
            <span style={{
              background: "linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
            }}>
              Feed
            </span>
          </motion.h1>
          <p style={{ color: "#475569", fontSize: "0.95rem" }}>
            A log of your recent on-chain transactions.
          </p>
        </div>

        {/* Stats Row */}
        {!loading && activities.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{ display: "flex", gap: "12px", marginBottom: "28px" }}
          >
            {[
              { label: "Total Txns", value: stats.total, color: "#a78bfa" },
              { label: "NFT Mints", value: stats.mints, color: "#c4b5fd" },
              { label: "Payments", value: stats.payments, color: "#93c5fd" },
            ].map((s) => (
              <div key={s.label} className="stat-card">
                <div style={{ fontSize: "1.6rem", fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: "0.75rem", color: "#475569", fontWeight: 600, marginTop: "2px" }}>{s.label}</div>
              </div>
            ))}
          </motion.div>
        )}

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          style={{ display: "flex", gap: "8px", marginBottom: "24px", flexWrap: "wrap", alignItems: "center" }}
        >
          {[
            { key: "all", label: "All" },
            { key: "mint", label: "🎨 Mints" },
            { key: "payment", label: "💸 Payments" },
          ].map(({ key, label }) => (
            <button
              key={key}
              className={`filter-pill ${filter === key ? "active" : ""}`}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
          {!loading && (
            <span style={{
              marginLeft: "auto", fontSize: "0.78rem", color: "#334155",
              fontWeight: 600, letterSpacing: "0.05em",
            }}>
              {filtered.length} TRANSACTIONS
            </span>
          )}
        </motion.div>

        {/* Loading Skeleton */}
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{
                background: "rgba(12,12,25,0.7)", border: "1px solid rgba(255,255,255,0.05)",
                borderRadius: "18px", padding: "20px 24px",
                display: "flex", gap: "16px", alignItems: "center",
              }}>
                <div className="skeleton" style={{ width: 52, height: 52, borderRadius: 16, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div className="skeleton" style={{ height: 16, width: "35%", marginBottom: 10 }} />
                  <div className="skeleton" style={{ height: 13, width: "65%" }} />
                </div>
                <div className="skeleton" style={{ height: 13, width: 60 }} />
              </div>
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && filtered.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              textAlign: "center", padding: "80px 20px",
              background: "rgba(12,12,25,0.5)",
              border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: "24px",
            }}
          >
            <div style={{ fontSize: "3.5rem", marginBottom: "16px", filter: "grayscale(0.3)" }}>📭</div>
            <h3 style={{ color: "#64748b", fontSize: "1.1rem", fontWeight: 700, marginBottom: "8px" }}>
              No Activity Yet
            </h3>
            <p style={{ color: "#334155", fontSize: "0.85rem" }}>
              Transactions will appear here once you mint or send NFTs.
            </p>
          </motion.div>
        )}

        {/* Activity List */}
        {!loading && filtered.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {filtered.map((tx, index) => {
              const info = getActivityInfo(tx, walletAddress);
              const isExpanded = expandedId === tx.id;

              return (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                  className="activity-row"
                  style={{ borderColor: isExpanded ? info.borderColor : "rgba(255,255,255,0.06)" }}
                  onClick={() => setExpandedId(isExpanded ? null : tx.id)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>

                    {/* Icon */}
                    <div
                      className="icon-ring"
                      style={{ background: info.bgColor, border: `1px solid ${info.borderColor}` }}
                    >
                      <span style={{
                        background: info.gradient,
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        fontSize: "1.4rem", fontWeight: 900,
                      }}>
                        {info.icon}
                      </span>
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                        <span style={{ color: "white", fontWeight: 700, fontSize: "0.95rem" }}>
                          {info.label}
                        </span>
                        {info.amount && (
                          <span style={{
                            background: info.bgColor, color: info.textColor,
                            border: `1px solid ${info.borderColor}`,
                            borderRadius: "8px", padding: "2px 10px",
                            fontSize: "0.75rem", fontWeight: 700,
                          }}>
                            {info.amount}
                          </span>
                        )}
                        <div
                          className="success-dot"
                          style={{ background: tx.successful ? "#10b981" : "#ef4444",
                            boxShadow: `0 0 6px ${tx.successful ? "rgba(16,185,129,0.6)" : "rgba(239,68,68,0.6)"}`,
                            marginLeft: "auto",
                          }}
                        />
                      </div>
                      <p style={{ color: "#64748b", fontSize: "0.82rem", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {info.description}
                      </p>
                    </div>

                    {/* Time */}
                    <div style={{ color: "#334155", fontSize: "0.78rem", flexShrink: 0, textAlign: "right", paddingLeft: "8px" }}>
                      {formatDate(tx.created_at)}
                      <div style={{ marginTop: "3px" }}>
                        <span style={{ fontSize: "0.65rem", color: isExpanded ? info.textColor : "#334155" }}>
                          {isExpanded ? "▲ less" : "▼ more"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        style={{ overflow: "hidden" }}
                      >
                        <div style={{ paddingTop: "16px", borderTop: `1px solid ${info.borderColor}`, marginTop: "16px" }}>
                          <div className="tx-hash-box">
                            🔗 {tx.hash}
                          </div>
                          <div style={{ display: "flex", gap: "8px", marginTop: "12px", flexWrap: "wrap" }}>
                            <a
                              href={`https://stellar.expert/explorer/testnet/tx/${tx.hash}`}
                              target="_blank" rel="noopener noreferrer"
                              className="explorer-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                window.open(
                                  `https://stellar.expert/explorer/testnet/tx/${tx.hash}`,
                                  '_blank',
                                  'noopener,noreferrer'
                                );
                              }}
                            >
                              View on Explorer ↗
                            </a>
                            <span style={{
                              padding: "7px 14px", borderRadius: "10px",
                              background: tx.successful ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                              border: `1px solid ${tx.successful ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}`,
                              color: tx.successful ? "#6ee7b7" : "#fca5a5",
                              fontSize: "0.78rem", fontWeight: 700,
                            }}>
                              {tx.successful ? "✓ Confirmed" : "✗ Failed"}
                            </span>
                            <span style={{
                              padding: "7px 14px", borderRadius: "10px",
                              background: "rgba(255,255,255,0.03)",
                              border: "1px solid rgba(255,255,255,0.07)",
                              color: "#475569", fontSize: "0.78rem", fontWeight: 600,
                            }}>
                              Fee: {(tx.fee_charged / 10000000).toFixed(7)} XLM
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        {!loading && filtered.length > 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            style={{ textAlign: "center", color: "#1e293b", fontSize: "0.75rem", marginTop: "32px", letterSpacing: "0.05em" }}
          >
            SHOWING {filtered.length} OF {activities.length} TRANSACTIONS • STELLAR TESTNET
          </motion.p>
        )}
      </motion.div>
    </div>
  );
}