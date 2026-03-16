import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import * as StellarSdk from "@stellar/stellar-sdk";
import { HORIZON_URL, ESCROW_CONTRACT_ID, SOROBAN_SERVER, NETWORK_PASSPHRASE } from "../constants";
import { useTheme } from "../context/ThemeContext";

const shortenAddr = (addr) => {
  if (!addr || typeof addr !== "string") return "";
  return `${addr.slice(0, 6)}...${addr.slice(-5)}`;
};

// ── Detect transaction type from operations ───────────────────────────────────
const getTxType = (tx) => {
  try {
    const envelope = StellarSdk.TransactionBuilder.fromXDR(
      tx.envelope_xdr, "Test SDF Network ; September 2015"
    );
    const op = envelope.operations?.[0];
    if (!op) return { icon: "⚡", label: "Transaction", color: "rgba(99,102,241,0.15)", text: "#a78bfa" };
    if (op.type === "invokeHostFunction") {
      // Check if escrow or NFT
      const xdr = op.func?.toXDR?.("base64") || "";
      if (xdr.includes(ESCROW_CONTRACT_ID.slice(0, 8))) {
        return { icon: "💼", label: "Job TX", color: "rgba(16,185,129,0.15)", text: "#34d399" };
      }
      return { icon: "🖼️", label: "NFT Minted", color: "rgba(139,92,246,0.15)", text: "#a78bfa" };
    }
    if (op.type === "payment") {
      return { icon: "💸", label: "Payment", color: "rgba(245,158,11,0.15)", text: "#fbbf24" };
    }
    if (op.type === "createAccount") {
      return { icon: "⭐", label: "Account Created", color: "rgba(59,130,246,0.15)", text: "#60a5fa" };
    }
  } catch {}
  return { icon: "⚡", label: "Transaction", color: "rgba(99,102,241,0.15)", text: "#a78bfa" };
};

export default function DashboardPage({ walletAddress, balance, nfts }) {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [recentTxs, setRecentTxs]   = useState([]);
  const [txLoading, setTxLoading]   = useState(true);
  const [jobsPosted, setJobsPosted] = useState(0);
  const [jobsDone, setJobsDone]     = useState(0);
  const [xlmEarned, setXlmEarned]   = useState(0);

  // ── Load jobs from escrow contract ─────────────────────────────────────────
  useEffect(() => {
    if (!walletAddress) return;
    const loadJobs = async () => {
      try {
        const dummy = new StellarSdk.Account(walletAddress, "0");
        const totalTx = new StellarSdk.TransactionBuilder(dummy, { fee: "100", networkPassphrase: NETWORK_PASSPHRASE })
          .addOperation(StellarSdk.Operation.invokeContractFunction({ contract: ESCROW_CONTRACT_ID, function: "get_total", args: [] }))
          .setTimeout(30).build();
        const totalSim = await SOROBAN_SERVER.simulateTransaction(totalTx);
        if (!totalSim?.result?.retval) return;
        const total = Number(StellarSdk.scValToNative(totalSim.result.retval));
        let posted = 0, done = 0, earned = 0;
        for (let id = 1; id <= total; id++) {
          try {
            const jobTx = new StellarSdk.TransactionBuilder(dummy, { fee: "100", networkPassphrase: NETWORK_PASSPHRASE })
              .addOperation(StellarSdk.Operation.invokeContractFunction({
                contract: ESCROW_CONTRACT_ID, function: "get_job",
                args: [StellarSdk.nativeToScVal(id, { type: "u32" })],
              }))
              .setTimeout(30).build();
            const sim = await SOROBAN_SERVER.simulateTransaction(jobTx);
            if (sim?.result?.retval) {
              const job = StellarSdk.scValToNative(sim.result.retval);
              const sk = typeof job.status === "object" ? Object.keys(job.status)[0] : job.status;
              if (String(job.client) === walletAddress) posted++;
              if (sk === "Completed" || sk === 3) {
                done++;
                if (String(job.freelancer) === walletAddress) {
                  earned += Number(job.amount) / 10_000_000;
                }
              }
            }
          } catch {}
        }
        setJobsPosted(posted);
        setJobsDone(done);
        setXlmEarned(earned);
      } catch (e) {
        console.error("Dashboard jobs error:", e);
      }
    };
    loadJobs();
  }, [walletAddress]);

  // ── Load recent transactions ────────────────────────────────────────────────
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

  const cardStyle = {
    background: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.8)",
    border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)",
    borderRadius: "16px", padding: "24px",
    boxShadow: isDark ? "none" : "0 4px 12px rgba(0,0,0,0.05)",
  };

  const StatCard = ({ icon, label, value, color, sub, delay }) => (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      style={{ ...cardStyle, display: "flex", alignItems: "center", gap: "16px", flex: "1 1 200px" }}>
      <div style={{ width: "52px", height: "52px", borderRadius: "16px", background: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.5)", fontSize: "0.85rem", marginBottom: "4px" }}>{label}</div>
        <div style={{ color: isDark ? "#fff" : "#1a1a2e", fontSize: "1.5rem", fontWeight: 700 }}>{value}</div>
        {sub && <div style={{ color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.4)", fontSize: "0.75rem", marginTop: "2px" }}>{sub}</div>}
      </div>
    </motion.div>
  );

  const stats = [
    { icon: "💰", label: "XLM Balance",     value: `${balance} XLM`,    color: "rgba(124,58,237,0.25)",  delay: 0.05 },
    { icon: "🖼️", label: "Total NFTs",       value: nfts?.length ?? 0,   color: "rgba(59,130,246,0.25)",  delay: 0.1  },
    { icon: "💼", label: "Jobs Posted",      value: jobsPosted,           color: "rgba(234,179,8,0.25)",   delay: 0.15, sub: "As client" },
    { icon: "✅", label: "Jobs Completed",   value: jobsDone,             color: "rgba(16,185,129,0.25)",  delay: 0.2,  sub: xlmEarned > 0 ? `+${xlmEarned.toFixed(0)} XLM earned` : undefined },
  ];

  const actions = [
    { icon: "🤝", label: "Post a Job",    to: "/escrow"      },
    { icon: "💸", label: "Send Payment",  to: "/payment"     },
    { icon: "🖼️", label: "Mint NFT",      to: "/mint"        },
    { icon: "🏪", label: "Marketplace",   to: "/marketplace" },
  ];

  const formatDate = (d) => {
    try {
      return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch { return d; }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      style={{ maxWidth: "1200px", margin: "0 auto", padding: "8px" }}>

      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ color: isDark ? "#fff" : "#1a1a2e", fontSize: "2rem", fontWeight: 700, marginBottom: "8px" }}>Overview</h1>
        <p style={{ color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)", fontSize: "0.95rem" }}>
          Welcome back,{" "}
          <span style={{ fontFamily: "monospace", color: isDark ? "#a78bfa" : "#7c3aed" }}>{shortenAddr(walletAddress)}</span>
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "20px", marginBottom: "32px" }}>
        {stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "24px" }}>

        {/* Quick Actions */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} style={{ flex: "1 1 400px" }}>
          <div style={{ ...cardStyle, height: "100%" }}>
            <h2 style={{ color: isDark ? "#fff" : "#1a1a2e", fontSize: "1.2rem", fontWeight: 700, marginBottom: "20px" }}>⚡ Quick Actions</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {actions.map((a) => (
                <motion.button key={a.to} whileHover={{ scale: 1.02, x: 4 }} whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(a.to)}
                  style={{ padding: "16px 20px", background: isDark ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: "14px", color: isDark ? "#fff" : "#1a1a2e", cursor: "pointer", display: "flex", alignItems: "center", gap: "16px", fontWeight: 700, fontSize: "1rem", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
                  <span style={{ fontSize: "24px" }}>{a.icon}</span>
                  {a.label}
                  <span style={{ marginLeft: "auto" }}>→</span>
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Recent Transactions — with type labels */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} style={{ flex: "1 1 400px" }}>
          <div style={{ ...cardStyle, height: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ color: isDark ? "#fff" : "#1a1a2e", fontSize: "1.2rem", fontWeight: 700 }}>📋 Recent Transactions</h2>
              <button onClick={() => navigate("/activity")}
                style={{ background: "transparent", border: isDark ? "1px solid rgba(124,58,237,0.3)" : "1px solid rgba(124,58,237,0.5)", borderRadius: "8px", color: isDark ? "#a78bfa" : "#6d28d9", padding: "6px 14px", fontSize: "0.85rem", cursor: "pointer", fontWeight: 600 }}>
                View All
              </button>
            </div>

            {txLoading ? (
              <div style={{ textAlign: "center", padding: "32px", color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)" }}>⏳ Loading...</div>
            ) : recentTxs.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px", color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)" }}>No transactions yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {recentTxs.map((tx, i) => {
                  const txType = getTxType(tx);
                  return (
                    <motion.div key={tx.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 + i * 0.05 }}
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)", border: isDark ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(0,0,0,0.05)", borderRadius: "12px", gap: "12px", cursor: "pointer" }}
                      onClick={() => window.open(`https://stellar.expert/explorer/testnet/tx/${tx.hash}`, "_blank")}>
                      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                        {/* Type icon with color */}
                        <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: txType.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>
                          {txType.icon}
                        </div>
                        <div>
                          {/* Type label instead of just hash */}
                          <div style={{ color: txType.text, fontSize: "0.9rem", fontWeight: 700, marginBottom: "2px" }}>
                            {txType.label}
                          </div>
                          <div style={{ color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.4)", fontSize: "0.75rem", fontFamily: "monospace" }}>
                            {shortenAddr(tx.hash)}
                          </div>
                        </div>
                      </div>
                      <div style={{ color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)", fontSize: "0.78rem", textAlign: "right", flexShrink: 0, minWidth: "70px", maxWidth: "90px", wordBreak: "break-word" }}>
                        {formatDate(tx.created_at)}
                        <div style={{ marginTop: "2px" }}>
                          <span style={{ background: tx.successful ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)", color: tx.successful ? "#10b981" : "#ef4444", padding: "1px 6px", borderRadius: "4px", fontSize: "0.7rem", fontWeight: 700 }}>
                            {tx.successful ? "✓" : "✗"}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
}