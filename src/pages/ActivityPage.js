import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useTheme } from "../context/ThemeContext";
import { useWallet } from "../WalletContext";
import * as StellarSdk from "@stellar/stellar-sdk";
import { HORIZON_URL, NETWORK_PASSPHRASE } from "../constants";
import { listenToActivities } from "../utils/activityService";
import {
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  ShoppingCart,
  Tag,
  Clock,
  Filter
} from "lucide-react";

const ActivityPage = () => {
  const { isDark } = useTheme();
  const { walletAddress } = useWallet();
  const [blockchainActivities, setBlockchainActivities] = useState([]);
  const [firebaseActivities, setFirebaseActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  const timeAgo = (dateStr) => {
    const date = new Date(dateStr);
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} mins ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    return `${days} days ago`;
  };

  const formatAmount = (amount) => {
    return parseFloat(amount).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 7
    });
  };

  // ─── Data Fetching ────────────────────────────────────────────────────────────

  const fetchActivity = useCallback(async () => {
    if (!walletAddress) return;
    setIsRefreshing(true);

    try {
      const allActivities = [];

      // 1. Fetch Stellar Transactions (Blockchain) - captures all account activity
      try {
        const server = new StellarSdk.Horizon.Server(HORIZON_URL);
        const txs = await server.transactions()
          .forAccount(walletAddress)
          .order("desc")
          .limit(20)
          .call();

        txs.records.forEach(tx => {
          try {
            const envelope = StellarSdk.TransactionBuilder.fromXDR(tx.envelope_xdr, NETWORK_PASSPHRASE);
            const op = envelope.operations[0];

            let title = "Account Activity";
            let type = "transaction";
            let color = "#94a3b8";
            let icon = <RefreshCw size={18} />;
            let description = `Transaction ${tx.hash.slice(0, 6)}...`;

            // Recognize payment operations
            if (op.type === "payment" && op.asset.isNative()) {
              const isSent = tx.source_account === walletAddress;
              type = isSent ? "payment_sent" : "payment_received";
              title = isSent ? "Sent XLM" : "Received XLM";
              description = isSent
                ? `Sent ${formatAmount(op.amount)} XLM to ${op.destination.slice(0, 4)}...${op.destination.slice(-4)}`
                : `Received ${formatAmount(op.amount)} XLM from ${tx.source_account.slice(0, 4)}...${tx.source_account.slice(-4)}`;
              color = isSent ? "#f87171" : "#34d399";
              icon = isSent ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />;
            }
            // Recognize contract calls (Soroban)
            else if (op.type === "invokeHostFunction") {
              title = "Contract Action";
              color = "#6366f1";
              if (tx.envelope_xdr.includes("mint")) {
                title = "NFT Minted";
                description = "Created a new digital asset on Soroban";
              } else if (tx.envelope_xdr.includes("approve")) {
                title = "Contract Approved";
                description = "Authorized XLM for escrow/contract";
              }
            }

            allActivities.push({
              id: tx.id,
              type, title, description, time: new Date(tx.created_at), color, icon
            });
          } catch (e) { /* skip unparseable */ }
        });
      } catch (e) {
        console.warn("Error fetching Stellar activity:", e);
      }

      setBlockchainActivities(allActivities);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Activity fetch error:", error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [walletAddress]);

  // Initial fetch
  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  // Auto-refresh blockchain every 60 seconds
  useEffect(() => {
    const interval = setInterval(fetchActivity, 60000);
    return () => clearInterval(interval);
  }, [fetchActivity]);

  // Real-time Firebase listener
  useEffect(() => {
    if (!walletAddress) return;
    
    const unsubscribe = listenToActivities(walletAddress, (newActivities) => {
      // Map Firebase activities to UI format
      const mapped = newActivities.map(act => ({
        id: act.id,
        type: act.type,
        title: act.title,
        description: act.description,
        time: new Date(act.timestamp),
        color: act.color || "#94a3b8",
        icon: getIconForType(act.type, act.color)
      }));
      setFirebaseActivities(mapped);
    });

    return () => unsubscribe();
  }, [walletAddress]);

  // Combined and sorted activities
  const activities = useMemo(() => {
    const combined = [...firebaseActivities, ...blockchainActivities];
    // Sort by time descending
    return combined.sort((a, b) => b.time - a.time);
  }, [firebaseActivities, blockchainActivities]);

  // Icon Helper
  function getIconForType(type, color) {
    if (type.includes("nft_minted")) return <RefreshCw size={18} />;
    if (type.includes("nft_listed")) return <Tag size={18} />;
    if (type.includes("nft_purchased")) return <ShoppingCart size={18} />;
    if (type.includes("nft_sold")) return <Tag size={18} />;
    if (type.includes("job_")) return <RefreshCw size={18} />;
    if (type.includes("payment_")) return <ArrowDownLeft size={18} />;
    return <RefreshCw size={18} />;
  }

  // ─── Filter Logic ─────────────────────────────────────────────────────────────

  const filteredActivities = useMemo(() => {
    return activities.filter(act => {
      if (filter === "payments") return act.type.includes("payment");
      if (filter === "nft") return act.type.includes("nft");
      return true;
    });
  }, [activities, filter]);

  // ─── Styles ───────────────────────────────────────────────────────────────────

  const containerStyle = {
    padding: "2rem",
    maxWidth: "800px",
    margin: "0 auto",
    color: isDark ? "#e2e8f0" : "#1e293b",
  };

  const headerStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
  };

  const cardStyle = (typeColor) => ({
    background: isDark ? "rgba(30, 41, 59, 0.4)" : "rgba(255, 255, 255, 0.8)",
    border: isDark ? "1px solid rgba(255, 255, 255, 0.05)" : "1px solid rgba(0, 0, 0, 0.05)",
    borderLeft: `4px solid ${typeColor}`,
    borderRadius: "12px",
    padding: "16px 20px",
    marginBottom: "12px",
    display: "flex",
    alignItems: "center",
    gap: "16px",
    transition: "transform 0.2s",
    boxShadow: isDark ? "none" : "0 2px 4px rgba(0,0,0,0.02)",
  });

  const tabStyle = (key) => ({
    padding: "8px 16px",
    borderRadius: "20px",
    border: "none",
    background: filter === key
      ? (isDark ? "rgba(99, 102, 241, 0.2)" : "rgba(99, 102, 241, 0.1)")
      : "transparent",
    color: filter === key
      ? (isDark ? "#a78bfa" : "#6366f1")
      : (isDark ? "#94a3b8" : "#64748b"),
    fontWeight: 600,
    fontSize: "0.9rem",
    cursor: "pointer",
    transition: "all 0.2s",
  });

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="main-content" style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 700, margin: 0, color: isDark ? "#fff" : "#0f172a" }}>Activity</h1>
          <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: isDark ? "#94a3b8" : "#64748b" }}>
            Real-time updates from blockchain & marketplace
          </p>
        </div>
        <button
          onClick={fetchActivity}
          disabled={isRefreshing}
          style={{
            background: isDark ? "rgba(255,255,255,0.05)" : "white",
            border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #e2e8f0",
            borderRadius: "10px",
            padding: "10px",
            color: isDark ? "#cbd5e1" : "#475569",
            cursor: isRefreshing ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "0.85rem",
            fontWeight: 500
          }}
        >
          <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "24px", overflowX: "auto", paddingBottom: "4px" }}>
        <button style={tabStyle("all")} onClick={() => setFilter("all")}>All Activity</button>
        <button style={tabStyle("payments")} onClick={() => setFilter("payments")}>Payments</button>
        <button style={tabStyle("nft")} onClick={() => setFilter("nft")}>NFTs</button>
      </div>

      {/* Activity List */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {loading ? (
          // Loading Skeleton
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{
              ...cardStyle("transparent"),
              borderLeft: "4px solid rgba(128,128,128,0.2)",
              height: "72px"
            }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: isDark ? "rgba(255,255,255,0.05)" : "#f1f5f9" }} />
              <div style={{ flex: 1 }}>
                <div style={{ width: "30%", height: "14px", background: isDark ? "rgba(255,255,255,0.05)" : "#f1f5f9", marginBottom: "8px", borderRadius: "4px" }} />
                <div style={{ width: "60%", height: "12px", background: isDark ? "rgba(255,255,255,0.05)" : "#f1f5f9", borderRadius: "4px" }} />
              </div>
            </div>
          ))
        ) : filteredActivities.length > 0 ? (
          filteredActivities.map((act) => (
            <div key={act.id} style={cardStyle(act.color)}>
              {/* Icon Bubble */}
              <div style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                background: `${act.color}20`, // 20% opacity hex
                color: act.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0
              }}>
                {act.icon}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "2px" }}>
                  <span style={{ fontWeight: 600, fontSize: "0.95rem", color: isDark ? "#fff" : "#0f172a" }}>
                    {act.title}
                  </span>
                  <span style={{ fontSize: "0.75rem", color: isDark ? "#64748b" : "#94a3b8", display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
                    <Clock size={12} /> {timeAgo(act.time)}
                  </span>
                </div>
                <p style={{
                  margin: 0,
                  fontSize: "0.85rem",
                  color: isDark ? "#94a3b8" : "#475569",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis"
                }}>
                  {act.description}
                </p>
              </div>
            </div>
          ))
        ) : (
          // Empty State
          <div style={{
            textAlign: "center",
            padding: "60px 20px",
            background: isDark ? "rgba(30, 41, 59, 0.2)" : "rgba(241, 245, 249, 0.5)",
            borderRadius: "16px",
            border: isDark ? "1px solid rgba(255,255,255,0.05)" : "1px solid #e2e8f0"
          }}>
            <Filter size={48} style={{ opacity: 0.2, marginBottom: "16px" }} />
            <h3 style={{ margin: "0 0 8px", fontSize: "1.1rem", fontWeight: 600 }}>No activity found</h3>
            <p style={{ margin: 0, fontSize: "0.9rem", color: isDark ? "#64748b" : "#94a3b8" }}>
              {filter === "all" ? "Transactions and marketplace actions will appear here." : "Try changing the filter to see more."}
            </p>
          </div>
        )}
      </div>

      <div style={{ textAlign: "center", marginTop: "24px", fontSize: "0.75rem", color: isDark ? "#475569" : "#94a3b8" }}>
        Auto-refreshing every 30s • Last updated: {lastUpdated.toLocaleTimeString()}
      </div>
    </div>
  );
};

export default ActivityPage;
