/**
 * IndexerStatus component
 * src/components/IndexerStatus.js
 * Shows indexing status in MonitoringPage
 */

import { useState, useEffect } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "../firebase";
import { runFullIndex, isIndexStale } from "../utils/dataIndexer";
import { useTheme } from "../context/ThemeContext";

export default function IndexerStatus({ walletAddress }) {
  const { isDark } = useTheme();
  const [indexing, setIndexing] = useState(false);
  const [lastIndexed, setLastIndexed] = useState(null);
  const [nftCount, setNftCount] = useState(0);
  const [jobCount, setJobCount] = useState(0);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    // Listen to index metadata
    const nftRef = ref(db, "indexed_data/nfts");
    const unsubNft = onValue(nftRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        setLastIndexed(data.lastIndexed);
        setNftCount(data.total || 0);
      }
    });

    const jobRef = ref(db, "indexed_data/jobs");
    const unsubJob = onValue(jobRef, (snap) => {
      if (snap.exists()) {
        setJobCount(snap.val().total || 0);
      }
    });

    // Check if stale
    isIndexStale().then(setStale);

    return () => { unsubNft(); unsubJob(); };
  }, []);

  const handleIndex = async () => {
    if (!walletAddress || indexing) return;
    setIndexing(true);
    await runFullIndex(walletAddress);
    setStale(false);
    setIndexing(false);
  };

  const timeAgo = (ts) => {
    if (!ts) return "Never";
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  return (
    <div style={{
      background: isDark ? "rgba(255,255,255,0.04)" : "#fff",
      border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)",
      borderRadius: "16px", padding: "20px", marginBottom: "24px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 700, color: isDark ? "#fff" : "#0f172a", margin: 0 }}>
          Data Indexer
        </h2>
        <button onClick={handleIndex} disabled={indexing} style={{
          padding: "6px 16px",
          background: indexing ? "rgba(99,102,241,0.2)" : "linear-gradient(135deg,#6366f1,#4f46e5)",
          border: "none", borderRadius: "8px",
          color: "white", cursor: indexing ? "not-allowed" : "pointer",
          fontSize: "0.8rem", fontWeight: 600,
        }}>
          {indexing ? "Indexing..." : "Run Index Now"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "12px" }}>
        {[
          { label: "NFTs Indexed", value: nftCount, color: "#8b5cf6" },
          { label: "Jobs Indexed", value: jobCount, color: "#6366f1" },
          { label: "Last Indexed", value: timeAgo(lastIndexed), color: stale ? "#f59e0b" : "#10b981" },
          { label: "Index Status", value: stale ? "Stale" : "Fresh", color: stale ? "#f59e0b" : "#10b981" },
        ].map(item => (
          <div key={item.label} style={{
            background: isDark ? "rgba(255,255,255,0.03)" : "#f8fafc",
            border: isDark ? "1px solid rgba(255,255,255,0.05)" : "1px solid #e2e8f0",
            borderRadius: "10px", padding: "12px", textAlign: "center",
          }}>
            <div style={{ fontSize: "1.3rem", fontWeight: 800, color: item.color }}>{item.value}</div>
            <div style={{ fontSize: "0.72rem", color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)", marginTop: "4px" }}>{item.label}</div>
          </div>
        ))}
      </div>

      <p style={{ fontSize: "0.75rem", color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)", margin: "12px 0 0" }}>
        Indexed data stored in Firebase → fast queries without blockchain calls
      </p>
    </div>
  );
}