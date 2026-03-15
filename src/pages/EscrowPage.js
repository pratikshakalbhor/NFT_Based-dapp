import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as StellarSdk from "@stellar/stellar-sdk";
import { useWallet } from "../WalletContext";
import { signTransaction } from "../walletService";
import { NETWORK, NETWORK_PASSPHRASE, ESCROW_CONTRACT_ID, CONTRACT_ID, HORIZON_URL, NATIVE_XLM_TOKEN } from "../constants";
import { useTheme } from "../context/ThemeContext";

const STATUS_COLORS = {
  0: { bg: "rgba(59,130,246,0.15)", color: "#60a5fa", label: "🔵 Open" },
  1: { bg: "rgba(234,179,8,0.15)", color: "#facc15", label: "🟡 In Progress" },
  2: { bg: "rgba(249,115,22,0.15)", color: "#fb923c", label: "🟠 Submitted" },
  3: { bg: "rgba(16,185,129,0.15)", color: "#34d399", label: "🟢 Completed" },
  4: { bg: "rgba(239,68,68,0.15)", color: "#f87171", label: "🔴 Cancelled" },
  Open: { bg: "rgba(59,130,246,0.15)", color: "#60a5fa", label: "🔵 Open" },
  InProgress: { bg: "rgba(234,179,8,0.15)", color: "#facc15", label: "🟡 In Progress" },
  Submitted: { bg: "rgba(249,115,22,0.15)", color: "#fb923c", label: "🟠 Submitted" },
  Completed: { bg: "rgba(16,185,129,0.15)", color: "#34d399", label: "🟢 Completed" },
  Cancelled: { bg: "rgba(239,68,68,0.15)", color: "#f87171", label: "🔴 Cancelled" },
};

const shortenAddr = (addr) => {
  if (!addr || typeof addr !== "string") return "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
};

const RPC_URL = "https://soroban-testnet.stellar.org";

// Unwrap array-wrapped status from contract (e.g. [0] -> 0, ["Open"] -> "Open")
const normalizeStatus = (status) => {
  if (Array.isArray(status)) return status[0];
  return status;
};

const isOpenStatus = (status) => {
  const s = normalizeStatus(status);
  if (typeof s === "number") return s === 0;
  if (typeof s === "string") return s === "Open" || s === "open";
  if (typeof s === "object" && s !== null) {
    const key = Object.keys(s)[0];
    return key === "Open" || key === "open";
  }
  return false;
};

const isInProgressStatus = (status) => {
  const s = normalizeStatus(status);
  if (typeof s === "number") return s === 1;
  if (typeof s === "string") return s === "InProgress";
  if (typeof s === "object" && s !== null) return Object.keys(s)[0] === "InProgress";
  return false;
};

const isSubmittedStatus = (status) => {
  const s = normalizeStatus(status);
  if (typeof s === "number") return s === 2;
  if (typeof s === "string") return s === "Submitted";
  if (typeof s === "object" && s !== null) return Object.keys(s)[0] === "Submitted";
  return false;
};

const getStatusKey = (status) => {
  const s = normalizeStatus(status);
  if (typeof s === "number") return s;
  if (typeof s === "string") return s;
  if (typeof s === "object" && s !== null) return Object.keys(s)[0];
  return 0;
};

export default function EscrowPage({ walletAddress, server, onJobPosted, onJobAccepted, onWorkSubmitted, onPaymentReleased }) {
  const { walletType } = useWallet();
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState("post");
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState("info");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [workUrl, setWorkUrl] = useState("");
  const [submitJobId, setSubmitJobId] = useState(null);

  const getRpc = () => {
    if (StellarSdk.rpc && StellarSdk.rpc.Server) return new StellarSdk.rpc.Server(RPC_URL);
    if (StellarSdk.SorobanRpc && StellarSdk.SorobanRpc.Server) return new StellarSdk.SorobanRpc.Server(RPC_URL);
    throw new Error("SorobanRpc not available");
  };

  const showStatus = (msg, type = "info") => {
    setStatus(msg);
    setStatusType(type);
    setTimeout(() => setStatus(""), 5000);
  };

  const loadJobs = async () => {
    try {
      setLoading(true);
      const rpc = getRpc();
      const account = new StellarSdk.Account(walletAddress, "0");

      const totalTx = new StellarSdk.TransactionBuilder(account, {
        fee: "100", networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(StellarSdk.Operation.invokeContractFunction({
          contract: ESCROW_CONTRACT_ID, function: "get_total", args: [],
        }))
        .setTimeout(30).build();

      const totalSim = await rpc.simulateTransaction(totalTx);
      if (!totalSim?.result?.retval) { setJobs([]); return; }

      const total = StellarSdk.scValToNative(totalSim.result.retval);
      const jobList = [];

      for (let i = 1; i <= Number(total); i++) {
        try {
          const jobTx = new StellarSdk.TransactionBuilder(account, {
            fee: "100", networkPassphrase: NETWORK_PASSPHRASE,
          })
            .addOperation(StellarSdk.Operation.invokeContractFunction({
              contract: ESCROW_CONTRACT_ID, function: "get_job",
              args: [StellarSdk.nativeToScVal(i, { type: "u32" })],
            }))
            .setTimeout(30).build();

          const jobSim = await rpc.simulateTransaction(jobTx);
          if (jobSim?.result?.retval) {
            const job = StellarSdk.scValToNative(jobSim.result.retval);
            jobList.push({ ...job, id: i });
          }
        } catch (e) {
          console.error("Job load error", i, e);
        }
      }
      setJobs(jobList);
    } catch (e) {
      console.error("Load jobs error:", e);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const invokeContract = async (method, args) => {
    const rpc = getRpc();
    const account = await rpc.getAccount(walletAddress);
    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: "100000", networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(StellarSdk.Operation.invokeContractFunction({
        contract: ESCROW_CONTRACT_ID, function: method, args,
      }))
      .setTimeout(60).build();

    const prepared = await rpc.prepareTransaction(tx);
    const signedXdr = await signTransaction(prepared.toXDR(), walletType, NETWORK, NETWORK_PASSPHRASE);
    const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
    const result = await rpc.sendTransaction(signedTx);

    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 1500));
      const poll = await rpc.getTransaction(result.hash);
      if (poll.status !== "NOT_FOUND") return poll;
    }
    return result;
  };

  const handlePostJob = async () => {
    if (!title || !description || !amount) { showStatus("Please fill all fields!", "error"); return; }
    try {
      setLoading(true);
      showStatus("Posting job...", "info");
      await invokeContract("post_job", [
        StellarSdk.nativeToScVal(walletAddress, { type: "address" }),
        StellarSdk.nativeToScVal(title, { type: "string" }),
        StellarSdk.nativeToScVal(description, { type: "string" }),
        StellarSdk.nativeToScVal(Math.floor(parseFloat(amount) * 10_000_000), { type: "i128" }),
        StellarSdk.nativeToScVal(NATIVE_XLM_TOKEN, { type: "address" }),
      ]);
      showStatus("✅ Job posted!", "success");
      setTitle(""); setDescription(""); setAmount("");
      await loadJobs();
      setActiveTab("find");
      onJobPosted && onJobPosted();
    } catch (e) {
      showStatus(`❌ Error: ${e.message}`, "error");
    } finally { setLoading(false); }
  };

  const handleAcceptJob = async (jobId) => {
    try {
      setLoading(true);
      showStatus("Accepting job...", "info");
      await invokeContract("accept_job", [
        StellarSdk.nativeToScVal(walletAddress, { type: "address" }),
        StellarSdk.nativeToScVal(jobId, { type: "u32" }),
      ]);
      showStatus("✅ Job accepted!", "success");
      await loadJobs();
      onJobAccepted && onJobAccepted(jobId);
    } catch (e) {
      showStatus(`❌ Error: ${e.message}`, "error");
    } finally { setLoading(false); }
  };

  const handleSubmitWork = async (jobId) => {
    if (!workUrl) { showStatus("Please enter work URL!", "error"); return; }
    try {
      setLoading(true);
      showStatus("Submitting work...", "info");
      await invokeContract("submit_work", [
        StellarSdk.nativeToScVal(walletAddress, { type: "address" }),
        StellarSdk.nativeToScVal(jobId, { type: "u32" }),
        StellarSdk.nativeToScVal(workUrl, { type: "string" }),
      ]);
      showStatus("✅ Work submitted!", "success");
      setWorkUrl(""); setSubmitJobId(null);
      await loadJobs();
      onWorkSubmitted && onWorkSubmitted(jobId);
    } catch (e) {
      showStatus(`❌ Error: ${e.message}`, "error");
    } finally { setLoading(false); }
  };

  const handleApproveJob = async (jobId) => {
    try {
      setLoading(true);

      // Step 1: Get job details from local state before approving
      const job = jobs.find(j => j.id === jobId);
      if (!job) throw new Error("Job not found");
      const freelancer = String(job.freelancer);

      // Step 2: Call approve_and_pay — contract automatically releases XLM to freelancer
      showStatus("⏳ Approving job & releasing XLM payment...", "info");
      await invokeContract("approve_and_pay", [
        StellarSdk.nativeToScVal(walletAddress, { type: "address" }),
        StellarSdk.nativeToScVal(jobId, { type: "u32" }),
      ]);
      showStatus("✅ XLM released to freelancer! Minting NFT certificate...", "success");

      // Step 3: Mint NFT certificate for freelancer
      try {
        const rpc = getRpc();
        const rpcAccount = await rpc.getAccount(walletAddress);
        const nftTx = new StellarSdk.TransactionBuilder(rpcAccount, {
          fee: "100000",
          networkPassphrase: NETWORK_PASSPHRASE,
        })
          .addOperation(StellarSdk.Operation.invokeContractFunction({
            contract: CONTRACT_ID,
            function: "mint_nft",
            args: [
              StellarSdk.nativeToScVal(walletAddress, { type: "address" }),
              StellarSdk.nativeToScVal(freelancer, { type: "address" }),
              StellarSdk.nativeToScVal(`Job Certificate: ${job.title}`, { type: "string" }),
              StellarSdk.nativeToScVal("ipfs://certificate", { type: "string" }),
            ],
          }))
          .setTimeout(60)
          .build();
        const preparedNft = await rpc.prepareTransaction(nftTx);
        const signedNftXdr = await signTransaction(preparedNft.toXDR(), walletType, NETWORK, NETWORK_PASSPHRASE);
        const signedNftTx = StellarSdk.TransactionBuilder.fromXDR(signedNftXdr, NETWORK_PASSPHRASE);
        await rpc.sendTransaction(signedNftTx);
      } catch (nftErr) {
        console.error("NFT mint error:", nftErr);
        // Non-fatal — payment already succeeded
      }

      // Step 4: Refresh balance
      try {
        const horizonServer = server || new StellarSdk.Horizon.Server(HORIZON_URL);
        const account = await horizonServer.loadAccount(walletAddress);
        const xlm = account.balances.find(b => b.asset_type === "native");
        if (xlm) console.log("Updated balance:", xlm.balance);
      } catch (e) { console.error("Balance refresh error:", e); }

      showStatus("✅ XLM sent + NFT Certificate minted!", "success");
      await loadJobs();
      onPaymentReleased && onPaymentReleased(jobId);
    } catch (e) {
      showStatus(`❌ Error: ${e.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelJob = async (jobId) => {
    try {
      setLoading(true);
      showStatus("⏳ Cancelling job & refunding XLM...", "info");
      await invokeContract("cancel_job", [
        StellarSdk.nativeToScVal(walletAddress, { type: "address" }),
        StellarSdk.nativeToScVal(jobId, { type: "u32" }),
        StellarSdk.nativeToScVal(NATIVE_XLM_TOKEN, { type: "address" }),
      ]);
      showStatus("✅ Job cancelled — XLM refunded to your wallet!", "success");
      await loadJobs();
      onPaymentReleased && onPaymentReleased(jobId); // trigger balance refresh in App.js
    } catch (e) {
      showStatus(`❌ Cancel error: ${e.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (walletAddress) loadJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletAddress]);


  const openJobs = jobs.filter(j => isOpenStatus(j.status));

  const myJobs = jobs.filter(j => {
    const isMyClient = j.client === walletAddress;
    const isActualFreelancer = j.freelancer === walletAddress && j.freelancer !== j.client;
    return isMyClient || isActualFreelancer;
  });

  console.log("All jobs:", jobs.length, "Open:", openJobs.length, "My:", myJobs.length);
  console.log("Wallet:", walletAddress);
  jobs.forEach(j => console.log("Job", j.id, "client:", j.client, "freelancer:", j.freelancer, "status:", j.status));

  const tabs = [
    { id: "post", label: "📝 Post Job" },
    { id: "find", label: "🔍 Find Jobs" },
    { id: "myjobs", label: "💼 My Jobs" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      style={{ maxWidth: "900px", margin: "0 auto", padding: "20px 16px" }}
    >
      <div style={{ textAlign: "center", marginBottom: "32px" }}>
        <h1 style={{
          fontSize: "clamp(1.8rem, 4vw, 2.5rem)", fontWeight: 800,
          background: isDark ? "linear-gradient(135deg, #a78bfa, #60a5fa)" : "linear-gradient(135deg, #4f46e5, #0ea5e9)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: "8px",
        }}>🤝 Freelancer Escrow</h1>
        <p style={{ color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)" }}>Safe payments on Stellar blockchain</p>
      </div>

      <AnimatePresence>
        {status && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{
              padding: "12px 16px", borderRadius: "12px", marginBottom: "20px",
              background: statusType === "success" ? "rgba(16,185,129,0.1)" : statusType === "error" ? "rgba(239,68,68,0.1)" : "rgba(99,102,241,0.1)",
              border: `1px solid ${statusType === "success" ? "rgba(16,185,129,0.3)" : statusType === "error" ? "rgba(239,68,68,0.3)" : "rgba(99,102,241,0.3)"}`,
              color: statusType === "success" ? "#34d399" : statusType === "error" ? "#f87171" : "#a5b4fc",
            }}>{status}</motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: "flex", gap: "8px", marginBottom: "24px", background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)", padding: "6px", borderRadius: "16px", border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)" }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            flex: 1, padding: "10px", borderRadius: "12px", border: "none", cursor: "pointer",
            fontWeight: 600, fontSize: "0.85rem", transition: "all 0.2s",
            background: activeTab === tab.id ? "linear-gradient(135deg, #7c3aed, #4f46e5)" : "transparent",
            color: activeTab === tab.id ? "#fff" : (isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"),
          }}>{tab.label}</button>
        ))}
      </div>

      {/* POST JOB */}
      {activeTab === "post" && (
        <div style={{ background: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.9)", border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)", borderRadius: "20px", padding: "28px", boxShadow: isDark ? "0 25px 50px rgba(88,28,135,0.4)" : "0 4px 24px rgba(0,0,0,0.08)" }}>
          <h2 style={{ color: isDark ? "#fff" : "#1a1a2e", marginBottom: "24px" }}>📝 Post a New Job</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)", fontSize: "0.85rem", marginBottom: "8px", display: "block" }}>Job Title</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Logo Design, Website..." disabled={loading}
                style={{ width: "100%", padding: "12px 16px", background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.12)", borderRadius: "12px", color: isDark ? "#fff" : "#1a1a2e", fontSize: "0.95rem", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)", fontSize: "0.85rem", marginBottom: "8px", display: "block" }}>Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the job requirements..." rows={3} disabled={loading}
                style={{ width: "100%", padding: "12px 16px", background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.12)", borderRadius: "12px", color: isDark ? "#fff" : "#1a1a2e", fontSize: "0.95rem", outline: "none", resize: "vertical", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)", fontSize: "0.85rem", marginBottom: "8px", display: "block" }}>Amount (XLM)</label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="100" min="1" disabled={loading}
                style={{ width: "100%", padding: "12px 16px", background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.12)", borderRadius: "12px", color: isDark ? "#fff" : "#1a1a2e", fontSize: "0.95rem", outline: "none", boxSizing: "border-box" }} />
            </div>
            {amount && (
              <div style={{ padding: "12px 16px", background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: "12px", color: "#a78bfa", fontSize: "0.85rem" }}>
                💡 {amount} XLM will be locked in escrow until job completion
              </div>
            )}
            <button onClick={handlePostJob} disabled={loading} style={{
              padding: "14px", background: loading ? "rgba(124,58,237,0.3)" : "linear-gradient(135deg, #7c3aed, #4f46e5)",
              border: "none", borderRadius: "14px", color: "#fff", fontWeight: 700, fontSize: "1rem", cursor: loading ? "not-allowed" : "pointer",
            }}>
              {loading ? "⏳ Processing..." : "🔒 Post Job & Lock XLM"}
            </button>
          </div>
        </div>
      )}

      {/* FIND JOBS */}
      {activeTab === "find" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 style={{ color: isDark ? "#fff" : "#1a1a2e" }}>🔍 Open Jobs ({openJobs.length})</h2>
            <button onClick={loadJobs} disabled={loading} style={{ padding: "8px 16px", background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.12)", borderRadius: "10px", color: isDark ? "#a78bfa" : "#6d28d9", cursor: "pointer" }}>
              🔄 Refresh
            </button>
          </div>
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px", color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)" }}>⏳ Loading jobs...</div>
          ) : openJobs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)", borderRadius: "20px", color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)" }}>
              😔 No open jobs found. Post one!
            </div>
          ) : openJobs.map((job, i) => (
            <div key={i} style={{ background: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.9)", border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)", borderRadius: "16px", padding: "20px", marginBottom: "12px", boxShadow: isDark ? "0 25px 50px rgba(88,28,135,0.4)" : "0 4px 24px rgba(0,0,0,0.08)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                <div>
                  <h3 style={{ color: isDark ? "#fff" : "#1a1a2e", marginBottom: "6px" }}>{job.title}</h3>
                  <p style={{ color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)", fontSize: "0.85rem", marginBottom: "6px" }}>{job.description}</p>
                  <p style={{ color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.5)", fontSize: "0.75rem" }}>Client: {shortenAddr(job.client)}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: "#34d399", fontWeight: 700, fontSize: "1.1rem", marginBottom: "8px" }}>
                    {(Number(job.amount) / 10_000_000).toFixed(2)} XLM
                  </div>
                  {job.client !== walletAddress ? (
                    <button onClick={() => handleAcceptJob(job.id)} disabled={loading} style={{ padding: "8px 16px", background: "linear-gradient(135deg, #059669, #047857)", border: "none", borderRadius: "10px", color: "#fff", fontWeight: 600, cursor: "pointer" }}>
                      ✅ Accept Job
                    </button>
                  ) : (
                    <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.3)", padding: "4px 8px", background: "rgba(255,255,255,0.05)", borderRadius: "8px" }}>Your job</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MY JOBS */}
      {activeTab === "myjobs" && (
        <div>
          <h2 style={{ color: isDark ? "#fff" : "#1a1a2e", marginBottom: "16px" }}>💼 My Jobs ({myJobs.length})</h2>
          {myJobs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)", borderRadius: "20px", color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)" }}>
              😔 No jobs yet! Post or accept a job.
            </div>
          ) : myJobs.map((job, i) => {
            const isClient = job.client === walletAddress;
            const isFreelancer = job.freelancer === walletAddress && job.freelancer !== job.client;
            const statusKey = getStatusKey(job.status);
            const statusInfo = STATUS_COLORS[statusKey] || STATUS_COLORS[0];

            return (
              <div key={i} style={{ background: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.9)", border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)", borderRadius: "16px", padding: "20px", marginBottom: "12px", boxShadow: isDark ? "0 25px 50px rgba(88,28,135,0.4)" : "0 4px 24px rgba(0,0,0,0.08)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
                  <div>
                    <h3 style={{ color: isDark ? "#fff" : "#1a1a2e", marginBottom: "4px" }}>{job.title}</h3>
                    <p style={{ color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)", fontSize: "0.85rem" }}>{job.description}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-block", padding: "4px 12px", borderRadius: "20px", background: statusInfo.bg, color: statusInfo.color, fontSize: "0.8rem", fontWeight: 600, marginBottom: "6px" }}>
                      {statusInfo.label}
                    </div>
                    <div style={{ color: "#34d399", fontWeight: 700 }}>{(Number(job.amount) / 10_000_000).toFixed(2)} XLM</div>
                  </div>
                </div>

                <div style={{ fontSize: "0.75rem", color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.5)", marginBottom: "12px" }}>
                  {isClient ? "👤 You are Client" : "💼 You are Freelancer"} • Job #{job.id}
                </div>

                {job.work_url && String(job.work_url) !== "" && (
                  <div style={{ padding: "8px 12px", background: "rgba(99,102,241,0.1)", borderRadius: "8px", marginBottom: "12px", fontSize: "0.8rem", color: "#a5b4fc" }}>
                    📎 Work: <a href={String(job.work_url)} target="_blank" rel="noopener noreferrer" style={{ color: "#818cf8" }}>{String(job.work_url)}</a>
                  </div>
                )}

                {isFreelancer && isInProgressStatus(job.status) && (
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <input
                      value={submitJobId === job.id ? workUrl : ""}
                      onChange={e => { setWorkUrl(e.target.value); setSubmitJobId(job.id); }}
                      placeholder="Enter work URL or IPFS link..."
                      style={{ flex: 1, minWidth: "200px", padding: "10px 14px", background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.12)", borderRadius: "10px", color: isDark ? "#fff" : "#1a1a2e", fontSize: "0.85rem", outline: "none" }}
                    />
                    <button onClick={() => handleSubmitWork(job.id)} disabled={loading} style={{ padding: "10px 20px", background: "linear-gradient(135deg, #f59e0b, #d97706)", border: "none", borderRadius: "10px", color: "#fff", fontWeight: 600, cursor: "pointer" }}>
                      📤 Submit Work
                    </button>
                  </div>
                )}

                {isClient && isSubmittedStatus(job.status) && (
                  <button onClick={() => handleApproveJob(job.id)} disabled={loading} style={{ padding: "10px 24px", background: "linear-gradient(135deg, #059669, #047857)", border: "none", borderRadius: "10px", color: "#fff", fontWeight: 600, cursor: "pointer", marginRight: "8px" }}>
                    ✅ Approve & Release Payment
                  </button>
                )}

                {isClient && isOpenStatus(job.status) && (
                  <button onClick={() => handleCancelJob(job.id)} disabled={loading} style={{ padding: "10px 24px", background: "linear-gradient(135deg, #dc2626, #b91c1c)", border: "none", borderRadius: "10px", color: "#fff", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer" }}>
                    ❌ Cancel & Refund XLM
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}