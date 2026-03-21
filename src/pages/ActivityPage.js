import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useTheme } from "../context/ThemeContext";
import { useWallet } from "../WalletContext";
import { ref, onValue } from "firebase/database";
import { db } from "../firebase";
import * as StellarSdk from "@stellar/stellar-sdk";
import { HORIZON_URL } from "../constants";
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
  const [activities, setActivities] = useState([]);
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

      // 1. Fetch Stellar Payments (Blockchain)
      try {
        const server = new StellarSdk.Horizon.Server(HORIZON_URL);
        const payments = await server.payments()
          .forAccount(walletAddress)
          .order("desc")
          .limit(20)
          .call();

        payments.records.forEach(p => {
          if (p.type === "payment" && p.asset_type === "native") {
            const isSent = p.from === walletAddress;
            allActivities.push({
              id: p.id,
              type: isSent ? "payment_sent" : "payment_received",
              title: isSent ? "Sent XLM" : "Received XLM",
              description: isSent 
                ? `Sent ${formatAmount(p.amount)} XLM to ${p.to.slice(0, 4)}...${p.to.slice(-4)}`
                : `Received ${formatAmount(p.amount)} XLM from ${p.from.slice(0, 4)}...${p.from.slice(-4)}`,
              time: new Date(p.created_at),
              amount: p.amount,
              color: isSent ? "#f87171" : "#34d399",
              icon: isSent ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />
            });
          }
        });
      } catch (e) {
        console.warn("Error fetching payments:", e);
      }

      // 2. Fetch Firebase Marketplace Activity
      // Note: We use a promise wrapper here to get the value once for the combined list
      const marketPromise = new Promise((resolve) => {
        const marketRef = ref(db, "marketplace");
        onValue(marketRef, (snap) => {
          const data = snap.val() || {};
          const marketEvents = [];
          
          Object.values(data).forEach(nft => {
            // NFT Purchased (Current user is owner and it is sold)
            if (nft.sold && nft.ownerFull === walletAddress && nft.soldAt) {
              marketEvents.push({
                id: `buy_${nft.nftKey}`,
                type: "nft_purchased",
                title: "NFT Purchased",
                description: `Purchased ${nft.name} for ${nft.price} XLM`,
                time: new Date(nft.soldAt),
                color: "#60a5fa",
                icon: <ShoppingCart size={18} />
              });
            }

            // NFT Sold (Current user was previous owner - assumes previousOwner field exists)
            if (nft.sold && nft.previousOwner === walletAddress && nft.soldAt) {
              marketEvents.push({
                id: `sold_${nft.nftKey}`,
                type: "nft_sold",
                title: "NFT Sold",
                description: `Sold ${nft.name} for ${nft.price} XLM`,
                time: new Date(nft.soldAt),
                color: "#a78bfa",
                icon: <Tag size={18} />
              });
            }

            // NFT Listed (Current user listed it)
            if (nft.listed && nft.ownerFull === walletAddress && nft.listedAt) {
              marketEvents.push({
                id: `list_${nft.nftKey}`,
                type: "nft_listed",
                title: "NFT Listed",
                description: `Listed ${nft.name} for ${nft.price} XLM`,
                time: new Date(nft.listedAt),
                color: "#fbbf24",
                icon: <Tag size={18} />
              });
            }
          });
          resolve(marketEvents);
        }, { onlyOnce: true });
      });

      const marketActivities = await marketPromise;
      allActivities.push(...marketActivities);

      // Sort by time descending
      allActivities.sort((a, b) => b.time - a.time);
      
      setActivities(allActivities);
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

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchActivity, 30000);
    return () => clearInterval(interval);
  }, [fetchActivity]);

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
