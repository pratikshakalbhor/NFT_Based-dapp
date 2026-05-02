/**
 * User Feedback: Add Search box in job page
 * Instant keyword search by job title and description
 * implemented in Find Jobs tab using searchQuery state
 */
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import * as StellarSdk from "@stellar/stellar-sdk";
import { useWallet } from "../WalletContext";
import { signTransaction } from "../walletService";
import {
  NETWORK, NETWORK_PASSPHRASE,
  ESCROW_CONTRACT_ID, CONTRACT_ID,
  NATIVE_XLM_TOKEN, SOROBAN_SERVER,
} from "../constants";
import { useTheme } from "../context/ThemeContext";
import { storeNotification } from "../utils/notificationService";
import { recordActivity } from "../utils/activityService";

const STATUS_COLORS = {
  0: { bg: "rgba(59,130,246,0.15)", color: "#60a5fa", label: "Open" },
  1: { bg: "rgba(234,179,8,0.15)", color: "#facc15", label: "In Progress" },
  2: { bg: "rgba(249,115,22,0.15)", color: "#fb923c", label: "Submitted" },
  3: { bg: "rgba(16,185,129,0.15)", color: "#34d399", label: "Completed" },
  4: { bg: "rgba(239,68,68,0.15)", color: "#f87171", label: "Cancelled" },
  Open: { bg: "rgba(59,130,246,0.15)", color: "#60a5fa", label: "Open" },
  InProgress: { bg: "rgba(234,179,8,0.15)", color: "#facc15", label: "In Progress" },
  Submitted: { bg: "rgba(249,115,22,0.15)", color: "#fb923c", label: "Submitted" },
  Completed: { bg: "rgba(16,185,129,0.15)", color: "#34d399", label: "Completed" },
  Cancelled: { bg: "rgba(239,68,68,0.15)", color: "#f87171", label: "Cancelled" },
};

const shortenAddr = (addr) => {
  if (!addr || typeof addr !== "string") return "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
};

const normalizeStatus = (status) => {
  if (Array.isArray(status)) return status[0];
  return status;
};
const getStatusKey = (status) => {
  const s = normalizeStatus(status);
  if (typeof s === "number") return s;
  if (typeof s === "string") return s;
  if (typeof s === "object" && s !== null) return Object.keys(s)[0];
  return 0;
};
const isOpenStatus = (s) => { const k = getStatusKey(s); return k === 0 || k === "Open"; };
const isInProgressStatus = (s) => { const k = getStatusKey(s); return k === 1 || k === "InProgress"; };
const isSubmittedStatus = (s) => { const k = getStatusKey(s); return k === 2 || k === "Submitted"; };

const buildSignSubmit = async (txUnsigned, walletType, label, onStatus) => {
  // Pre-flight: ensure a Stellar wallet is actually connected
  if (!walletType) {
    throw new Error("No wallet connected. Please connect Freighter, Albedo, or xBull first.");
  }

  onStatus(`⏳ ${label}: simulating transaction...`, "info");

  // Step 1: Simulate
  let simulation;
  try {
    simulation = await SOROBAN_SERVER.simulateTransaction(txUnsigned);
  } catch (e) {
    throw new Error(`${label} simulation failed: ${e.message}`);
  }

  if (StellarSdk.rpc.Api.isSimulationError(simulation)) {
    throw new Error(`${label} simulation error: ${simulation.error}`);
  }

  // Step 2: Assemble (injects Soroban auth + footprint)
  let assembled;
  try {
    assembled = StellarSdk.rpc.assembleTransaction(txUnsigned, simulation).build();
  } catch (e) {
    throw new Error(`${label} assembly failed: ${e.message}`);
  }

  onStatus(`✍️ ${label}: please sign in your wallet...`, "info");

  // Step 3: Sign — always pass networkPassphrase (not "TESTNET")
  const signedXdr = await signTransaction(assembled.toXDR(), {
    walletType,
    network: NETWORK,
    networkPassphrase: NETWORK_PASSPHRASE,
  });

  if (!signedXdr) throw new Error(`${label}: signing cancelled.`);

  // Step 4: Submit via Soroban RPC
  const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
  const response = await SOROBAN_SERVER.sendTransaction(signedTx);

  if (response.status === "ERROR") {
    throw new Error(`${label} error: ${JSON.stringify(response.errorResult ?? response)}`);
  }

  // Step 5: Poll for confirmation
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const poll = await SOROBAN_SERVER.getTransaction(response.hash);
    if (poll.status === "SUCCESS") return { hash: response.hash, retval: poll.returnValue };
    if (poll.status === "FAILED") throw new Error(`${label} failed on-chain.`);
  }
  throw new Error(`${label} timed out. Hash: ${response.hash}`);
};

export default function EscrowPage({
  walletAddress, server,
  onJobPosted, onJobAccepted, onWorkSubmitted, onPaymentReleased,
}) {
  const { walletType } = useWallet();
  const navigate = useNavigate();
  const { isDark } = useTheme();

  const [activeTab, setActiveTab] = useState("post");
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState("info");
  const [searchQuery, setSearchQuery] = useState(""); // Search state

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [workUrl, setWorkUrl] = useState("");
  const [submitJobId, setSubmitJobId] = useState(null);
  const [uploadStatus, setUploadStatus] = useState({});

  const handleFileUpload = async (file, jobId) => {
    setUploadStatus((prev) => ({
      ...prev,
      [jobId]: { type: "loading", message: " Uploading file..." },
    }));

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("pinataMetadata", JSON.stringify({ name: file.name }));

      const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.REACT_APP_PINATA_JWT}` },
        body: formData,
      });
      const data = await res.json();

      if (data.IpfsHash) {
        const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`;
        setWorkUrl(ipfsUrl);
        setSubmitJobId(jobId);
        setUploadStatus((prev) => ({ ...prev, [jobId]: { type: "success", message: ` File uploaded! Ready to submit.` } }));
      } else throw new Error("Upload failed");
    } catch (err) {
      setUploadStatus((prev) => ({ ...prev, [jobId]: { type: "error", message: ` Upload failed: ${err.message}` } }));
    }
  };

  const showStatus = (msg, type = "info") => {
    setStatus(msg);
    setStatusType(type);
    if (type === "success") setTimeout(() => setStatus(""), 6000);
  };

  const loadJobs = async () => {
    try {
      setLoading(true);
      const dummyAccount = new StellarSdk.Account(walletAddress, "0");
      const totalTx = new StellarSdk.TransactionBuilder(dummyAccount, {
        fee: "100", networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(StellarSdk.Operation.invokeContractFunction({
          contract: ESCROW_CONTRACT_ID, function: "get_total", args: [],
        }))
        .setTimeout(30).build();
      const totalSim = await SOROBAN_SERVER.simulateTransaction(totalTx);
      if (!totalSim?.result?.retval) { setJobs([]); return; }
      const total = Number(StellarSdk.scValToNative(totalSim.result.retval));
      if (!total) { setJobs([]); return; }
      const jobList = [];
      for (let id = 1; id <= total; id++) {
        try {
          const jobTx = new StellarSdk.TransactionBuilder(dummyAccount, {
            fee: "100", networkPassphrase: NETWORK_PASSPHRASE,
          })
            .addOperation(StellarSdk.Operation.invokeContractFunction({
              contract: ESCROW_CONTRACT_ID, function: "get_job",
              args: [StellarSdk.nativeToScVal(id, { type: "u32" })],
            }))
            .setTimeout(30).build();
          const jobSim = await SOROBAN_SERVER.simulateTransaction(jobTx);
          if (jobSim?.result?.retval) {
            const job = StellarSdk.scValToNative(jobSim.result.retval);
            jobList.push({ ...job, id });
          }
        } catch (e) { console.error("Job load error", id, e); }
      }
      setJobs(jobList);
    } catch (e) {
      console.error("loadJobs error:", e);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (walletAddress) loadJobs(); }, [walletAddress]); // eslint-disable-line

  const handlePostJob = async () => {
    if (!title.trim()) { showStatus("Please enter a job title!", "error"); return; }
    if (!description.trim()) { showStatus("Please enter a description!", "error"); return; }
    const xlm = parseFloat(amount);
    if (!xlm || xlm <= 0) { showStatus("Please enter a valid XLM amount!", "error"); return; }
    if (!walletType) { showStatus("Wallet not connected.", "error"); return; }
    const amountStroops = Math.round(xlm * 10_000_000);
    const ledgerInfo = await SOROBAN_SERVER.getLatestLedger();
    const EXPIRY_LEDGER = ledgerInfo.sequence + 500;
    setLoading(true);
    
    try {
      // Step 1: Approve
      showStatus("Step 1 of 2: Approving XLM transfer — please sign...", "info");
      const approveAccount = await SOROBAN_SERVER.getAccount(walletAddress);
      const approveTx = new StellarSdk.TransactionBuilder(approveAccount, {
        fee: "1000000", networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(new StellarSdk.Contract(NATIVE_XLM_TOKEN).call(
          "approve",
          new StellarSdk.Address(walletAddress).toScVal(),
          new StellarSdk.Address(ESCROW_CONTRACT_ID).toScVal(),
          StellarSdk.nativeToScVal(amountStroops, { type: "i128" }),
          StellarSdk.nativeToScVal(EXPIRY_LEDGER, { type: "u32" })
        ))
        .setTimeout(300).build();
      
      await buildSignSubmit(approveTx, walletType, "approve", showStatus);

      // Step 2: Post Job
      showStatus("Step 2 of 2: Posting job — please sign...", "info");
      const postAccount = await SOROBAN_SERVER.getAccount(walletAddress);
      const postTx = new StellarSdk.TransactionBuilder(postAccount, {
        fee: "1000000", networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(new StellarSdk.Contract(ESCROW_CONTRACT_ID).call(
          "post_job",
          new StellarSdk.Address(walletAddress).toScVal(),
          StellarSdk.nativeToScVal(title.trim(), { type: "string" }),
          StellarSdk.nativeToScVal(description.trim(), { type: "string" }),
          StellarSdk.nativeToScVal(amountStroops, { type: "i128" })
        ))
        .setTimeout(300).build();
      
      await buildSignSubmit(postTx, walletType, "post_job", showStatus);

      showStatus("✅ Job posted successfully! XLM locked in escrow.", "success");
      
      // Log Activity
      await recordActivity(walletAddress, {
        type: "job_posted",
        title: "Job Posted",
        description: `Posted "${title.trim()}" for ${xlm} XLM`,
        color: "#6366f1"
      });

      setTitle(""); setDescription(""); setAmount("");
      await loadJobs();
      setActiveTab("find");
      onJobPosted?.();
    } catch (e) {
      console.error("[escrow] handlePostJob error:", e);
      showStatus(`❌ ${e.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptJob = async (jobId) => {
    setLoading(true);
    try {
      const account = await SOROBAN_SERVER.getAccount(walletAddress);
      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: "1000000", networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(new StellarSdk.Contract(ESCROW_CONTRACT_ID).call(
          "accept_job",
          new StellarSdk.Address(walletAddress).toScVal(),
          StellarSdk.nativeToScVal(jobId, { type: "u32" })
        ))
        .setTimeout(300).build();
      await buildSignSubmit(tx, walletType, "accept_job", showStatus);
      showStatus(" Job accepted! You are now the assigned freelancer.", "success");
      
      // Log Activity
      const acceptedJob = jobs.find(j => j.id === jobId);
      await recordActivity(walletAddress, {
        type: "job_accepted",
        title: "Job Accepted",
        description: `Accepted job: "${acceptedJob?.title || jobId}"`,
        color: "#facc15"
      });

      await loadJobs();
      onJobAccepted?.(jobId);
    } catch (e) {
      showStatus(` ${e.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitWork = async (jobId) => {
    if (!workUrl.trim()) { showStatus("Please enter a work URL!", "error"); return; }
    setLoading(true);
    try {
      const account = await SOROBAN_SERVER.getAccount(walletAddress);
      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: "1000000", networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(new StellarSdk.Contract(ESCROW_CONTRACT_ID).call(
          "submit_work",
          new StellarSdk.Address(walletAddress).toScVal(),
          StellarSdk.nativeToScVal(jobId, { type: "u32" }),
          StellarSdk.nativeToScVal(workUrl.trim(), { type: "string" })
        ))
        .setTimeout(300).build();
      await buildSignSubmit(tx, walletType, "submit_work", showStatus);
      showStatus(" Work submitted! Waiting for client approval.", "success");
      
      // Log Activity
      const submittedJob = jobs.find(j => j.id === jobId);
      await recordActivity(walletAddress, {
        type: "job_submitted",
        title: "Work Submitted",
        description: `Submitted work for: "${submittedJob?.title || jobId}"`,
        color: "#fb923c"
      });

      setWorkUrl(""); setSubmitJobId(null);
      await loadJobs();
      onWorkSubmitted?.(jobId);
    } catch (e) {
      showStatus(` ${e.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveJob = async (jobId) => {
    setLoading(true);
    try {
      const job = jobs.find((j) => j.id === jobId);
      if (!job) throw new Error("Job not found in local state.");

      const freelancer = String(job.freelancer);
      const amountXLM = (Number(job.amount) / 10_000_000).toFixed(2);

      // Step 1: Release payment
      showStatus("⏳ Releasing XLM payment — please sign...", "info");
      const account = await SOROBAN_SERVER.getAccount(walletAddress);
      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: "1000000", networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(new StellarSdk.Contract(ESCROW_CONTRACT_ID).call(
          "approve_job",
          new StellarSdk.Address(walletAddress).toScVal(),
          StellarSdk.nativeToScVal(jobId, { type: "u32" })
        ))
        .setTimeout(300).build();

      await buildSignSubmit(tx, walletType, "approve_job", showStatus);

      // Step 2: Payment notifications
      await Promise.all([
        storeNotification(freelancer, walletAddress, ` Payment received: ${amountXLM} XLM for "${job.title}"`, String(job.title)),
        storeNotification(walletAddress, freelancer, ` Payment sent: ${amountXLM} XLM for "${job.title}"`, String(job.title)),
      ]);

      showStatus(` Payment of ${amountXLM} XLM sent to ${shortenAddr(freelancer)}! Minting NFT certificate...`, "success");

      // Log Activities
      await recordActivity(walletAddress, { type: "payment_released", title: "Payment Released", description: `Released ${amountXLM} XLM for "${job.title}"`, color: "#34d399" });
      await recordActivity(freelancer, { type: "payment_received", title: "Payment Received", description: `Received ${amountXLM} XLM for "${job.title}"`, color: "#34d399" });

      // Step 4: Mint NFT certificate
      try {
        const nftAccount = await SOROBAN_SERVER.getAccount(walletAddress);
        const sanitizeSymbol = (s) =>
          String(s).trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_").slice(0, 32);
        const nftTx = new StellarSdk.TransactionBuilder(nftAccount, { fee: "1000000", networkPassphrase: NETWORK_PASSPHRASE })
          .addOperation(new StellarSdk.Contract(CONTRACT_ID).call(
            "mint_nft",
            new StellarSdk.Address(walletAddress).toScVal(),
            new StellarSdk.Address(freelancer).toScVal(),
            StellarSdk.nativeToScVal(sanitizeSymbol(`JOB_CERT_${job.title}`), { type: "symbol" }),
            StellarSdk.nativeToScVal(sanitizeSymbol(job.work_url && String(job.work_url) !== "" ? String(job.work_url) : "IPFS_CERTIFICATE"), { type: "symbol" })
          ))
          .setTimeout(300).build();

        await buildSignSubmit(nftTx, walletType, "mint_nft (certificate)", showStatus);
        showStatus(` ${amountXLM} XLM sent + NFT Certificate minted for freelancer!`, "success");
      } catch (nftErr) {
        showStatus(` ${amountXLM} XLM sent to freelancer! (NFT cert failed — non-fatal)`, "success");
      }

      await loadJobs();
      onPaymentReleased?.(jobId);
    } catch (e) {
      showStatus(` ${e.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelJob = async (jobId) => {
    setLoading(true);
    try {
      showStatus(" Cancelling job & refunding XLM — please sign...", "info");
      const account = await SOROBAN_SERVER.getAccount(walletAddress);
      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: "1000000", networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(new StellarSdk.Contract(ESCROW_CONTRACT_ID).call(
          "cancel_job",
          new StellarSdk.Address(walletAddress).toScVal(),
          StellarSdk.nativeToScVal(jobId, { type: "u32" })
        ))
        .setTimeout(300).build();
      await buildSignSubmit(tx, walletType, "cancel_job", showStatus);
      showStatus(" Job cancelled — XLM refunded to your wallet!", "success");
      await loadJobs();
      onPaymentReleased?.(jobId);
    } catch (e) {
      showStatus(` ${e.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const openJobs = jobs.filter((j) => {
    if (!isOpenStatus(j.status)) return false;
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      j.title?.toLowerCase().includes(query) ||
      j.description?.toLowerCase().includes(query)
    );
  });

  const myJobs = jobs.filter((j) => {
    const isMyClient = String(j.client) === walletAddress;
    const isFreelancer = String(j.freelancer) === walletAddress && String(j.freelancer) !== String(j.client);
    return isMyClient || isFreelancer;
  });

  const tabs = [
    { id: "post", label: "Post Job", count: null },
    { id: "find", label: "Find Jobs", count: openJobs.length },
    { id: "myjobs", label: "My Jobs", count: myJobs.length },
  ];

  const inputStyle = {
    width: "100%", padding: "12px 16px", borderRadius: "12px",
    background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
    border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.12)",
    color: isDark ? "#fff" : "#1a1a2e", fontSize: "0.95rem",
    outline: "none", boxSizing: "border-box", transition: "all 0.2s",
  };

  const cardStyle = {
    background: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.9)",
    border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)",
    borderRadius: "16px", padding: "20px", marginBottom: "12px",
    boxShadow: isDark ? "0 10px 30px rgba(0,0,0,0.2)" : "0 4px 24px rgba(0,0,0,0.08)",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    cursor: "default",
  };

  const spinner = (
    <span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"8px"}}>
      <span style={{width:"16px",height:"16px",border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"white",borderRadius:"50%",animation:"spin 0.8s linear infinite",display:"inline-block"}}/>
      Processing...
    </span>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      style={{ maxWidth: "900px", margin: "0 auto", padding: "20px 16px" }}>
      
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeInUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        .market-card:hover { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(99,102,241,0.15) !important; }
      `}</style>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "32px" }}>
        <h1 style={{
          fontSize: "clamp(1.8rem, 4vw, 2.5rem)", fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800,
          background: isDark ? "linear-gradient(135deg, #a78bfa, #60a5fa)" : "linear-gradient(135deg, #4f46e5, #0ea5e9)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: "8px",
        }}>Freelancer Escrow</h1>
        <p style={{ color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)" }}>
          Secure, transparent job payments powered by Stellar
        </p>
      </div>

      {/* Status banner */}
      <AnimatePresence>
        {status && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{
              padding: "12px 16px", borderRadius: "12px", marginBottom: "20px",
              background: statusType === "success" ? "rgba(16,185,129,0.1)" : statusType === "error" ? "rgba(239,68,68,0.1)" : "rgba(99,102,241,0.1)",
              border: `1px solid ${statusType === "success" ? "rgba(16,185,129,0.3)" : statusType === "error" ? "rgba(239,68,68,0.3)" : "rgba(99,102,241,0.3)"}`,
              color: statusType === "success" ? "#34d399" : statusType === "error" ? "#f87171" : "#a5b4fc",
              display: "flex", alignItems: "center", gap: "8px"
            }}>
            {statusType === "success" && "✓ "}
            {statusType === "error" && "✕ "}
            {statusType === "info" && "⟳ "}
            {status}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "24px", background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)", padding: "6px", borderRadius: "16px", border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)" }}>
        {tabs.map((tab) => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id)} 
            style={{
              flex: 1, padding: "10px", borderRadius: "12px", border: "none", cursor: "pointer",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 600, fontSize: "0.85rem", transition: "all 0.2s",
              background: activeTab === tab.id ? "linear-gradient(135deg, #7c3aed, #4f46e5)" : "transparent",
              color: activeTab === tab.id ? "#fff" : (isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"),
              display: "flex", alignItems: "center", justifyContent: "center"
            }}
          >
            {tab.label}
            {tab.count !== null && (
              <span style={{
                marginLeft:"6px", fontSize:"0.7rem", 
                background: activeTab === tab.id ? "rgba(255,255,255,0.2)" : "rgba(99,102,241,0.15)", 
                padding:"2px 6px", borderRadius:"10px", color: activeTab === tab.id ? "#fff" : "#6366f1"
              }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content with Animation */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.2 }}
        >
          {/* ── POST JOB ── */}
          {activeTab === "post" && (
            <div style={{ ...cardStyle, padding: "28px" }}>
              <h2 style={{ color: isDark ? "#fff" : "#1a1a2e", marginBottom: "24px" }}>Post a New Job</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={{ color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)", fontSize: "0.85rem", marginBottom: "8px", display: "block" }}>Job Title</label>
                  <input value={title} onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Logo Design, Website..." disabled={loading} style={inputStyle} />
                </div>
                <div>
                  <label style={{ color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)", fontSize: "0.85rem", marginBottom: "8px", display: "block" }}>Description</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the job requirements..." rows={3} disabled={loading}
                    style={{ ...inputStyle, resize: "vertical" }} />
                </div>
                <div>
                  <label style={{ color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)", fontSize: "0.85rem", marginBottom: "8px", display: "block" }}>Amount (XLM)</label>
                  <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                    placeholder="100" min="1" disabled={loading} style={inputStyle} />
                </div>
                {amount && (
                  <div style={{ padding: "12px 16px", background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: "12px", color: "#a78bfa", fontSize: "0.85rem" }}>
                    {amount} XLM will be locked in escrow until job completion
                  </div>
                )}
                <div style={{ padding: "12px 16px", background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: "12px", fontSize: "0.8rem", color: "#60a5fa" }}>
                  This requires <strong>2 wallet signatures</strong>:<br />
                  &nbsp;&nbsp;1️⃣ Approve XLM transfer to escrow contract<br />
                  &nbsp;&nbsp;2️⃣ Post job &amp; lock XLM on-chain
                </div>
                <button 
                  onClick={handlePostJob} 
                  disabled={loading} 
                  onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-1px)";e.currentTarget.style.boxShadow="0 8px 20px rgba(0,0,0,0.2)"}}
                  onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="none"}}
                  style={{
                    padding: "14px",
                    background: loading ? "rgba(124,58,237,0.3)" : "linear-gradient(135deg, #7c3aed, #4f46e5)",
                    border: "none", borderRadius: "14px", color: "#fff", fontWeight: 700, fontSize: "1rem",
                    cursor: loading ? "not-allowed" : "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  {loading ? spinner : "Post Job & Lock XLM"}
                </button>
              </div>
            </div>
          )}

          {/* ── FIND JOBS ── */}
          {activeTab === "find" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h2 style={{ color: isDark ? "#fff" : "#1a1a2e" }}>Open Jobs ({openJobs.length})</h2>
                <button 
                  onClick={loadJobs} 
                  disabled={loading}
                  onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-1px)"}}
                  onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)"}}
                  style={{ 
                    padding: "8px 16px", 
                    background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", 
                    border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.12)", 
                    borderRadius: "10px", color: isDark ? "#a78bfa" : "#6d28d9", 
                    cursor: "pointer", transition: "all 0.2s"
                  }}
                >
                  {loading ? "Refreshing..." : "Refresh" }
                </button>
              </div>

              {/* Search Box */}
              <div style={{ position: "relative", marginBottom: "16px" }}>
                <input
                  type="text"
                  placeholder="🔍 Search jobs by title or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 40px 12px 44px",
                    borderRadius: "12px",
                    border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.1)",
                    background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                    color: isDark ? "#fff" : "#1a1a2e",
                    fontSize: "0.95rem",
                    outline: "none",
                    boxSizing: "border-box",
                    transition: "border 0.2s",
                  }}
                  onFocus={e => e.target.style.borderColor = "#6366f1"}
                  onBlur={e => e.target.style.borderColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}
                />
                <div style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", fontSize: "16px", opacity: 0.7 }}>🔍</div>
                {searchQuery && (
                  <div style={{
                    position: "absolute", right: "44px", top: "50%", transform: "translateY(-50%)",
                    background: "#7c3aed", color: "white", padding: "2px 8px", borderRadius: "8px", fontSize: "0.7rem", fontWeight: 700
                  }}>
                    {openJobs.length} results
                  </div>
                )}
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    style={{
                      position: "absolute", right: "12px", top: "50%",
                      transform: "translateY(-50%)",
                      background: "transparent", border: "none",
                      color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)",
                      cursor: "pointer", fontSize: "16px",
                    }}
                  >✕</button>
                )}
              </div>

              {loading ? (
                <div style={{ textAlign: "center", padding: "40px", color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)" }}>⏳ Loading jobs...</div>
              ) : openJobs.length === 0 ? (
                <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} style={{textAlign:"center",padding:"60px 20px"}}>
                  <div style={{fontSize:"3rem",marginBottom:"12px"}}>💼</div>
                  <h3 style={{color: isDark ? "#fff" : "#1a1a2e"}}>{searchQuery ? "No jobs found" : "No open jobs yet"}</h3>
                  <p style={{color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"}}>{searchQuery ? "Try a different search term" : "Be the first to post a job!"}</p>
                  <button 
                    onClick={() => {setSearchQuery(""); setActiveTab("post");}} 
                    onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-1px)";e.currentTarget.style.boxShadow="0 8px 20px rgba(0,0,0,0.2)"}}
                    onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="none"}}
                    style={{ marginTop: "12px", padding: "10px 20px", background: "linear-gradient(135deg, #7c3aed, #4f46e5)", border: "none", borderRadius: "10px", color: "white", cursor: "pointer", fontWeight: 600 }}
                  >
                    Post a Job
                  </button>
                </motion.div>
              ) : openJobs.map((job, i) => (
                <motion.div 
                  key={job.id} 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.3 }}
                  style={cardStyle}
                  onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 12px 30px rgba(99,102,241,0.15)"}}
                  onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow=isDark ? "0 10px 30px rgba(0,0,0,0.2)" : "0 4px 24px rgba(0,0,0,0.08)"}}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                    <div style={{ flex: 1, minWidth: "250px" }}>
                      <h3 style={{ color: isDark ? "#fff" : "#1a1a2e", fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, marginBottom: "6px" }}>{job.title}</h3>
                      <p style={{ color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)", fontSize: "0.85rem", marginBottom: "8px", lineHeight: "1.5" }}>{job.description}</p>
                      <p style={{ color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.45)", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.7rem" }}>Client: {shortenAddr(String(job.client))}</p>
                    </div>
                    <div style={{ textAlign: "right", minWidth: "120px" }}>
                      <div style={{ color: "#34d399", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: "1.2rem", marginBottom: "12px" }}>
                        {(Number(job.amount) / 10_000_000).toFixed(2)} XLM
                      </div>
                      {String(job.client) !== walletAddress ? (
                        <button 
                          onClick={() => handleAcceptJob(job.id)} 
                          disabled={loading} 
                          onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-1px)";e.currentTarget.style.boxShadow="0 8px 20px rgba(0,0,0,0.2)"}}
                          onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="none"}}
                          style={{ 
                            width: "100%", padding: "10px", 
                            background: "linear-gradient(135deg, #059669, #047857)", 
                            border: "none", borderRadius: "10px", color: "#fff", 
                            fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", transition: "all 0.2s"
                          }}
                        >
                          {loading ? spinner : "Accept Job"}
                        </button>
                      ) : (
                        <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.3)", padding: "4px 12px", background: "rgba(255,255,255,0.05)", borderRadius: "8px", display: "block", textAlign: "center" }}>Your job</span>
                      )}
                      <button
                        onClick={() => navigate("/chat", { state: { recipientAddress: String(job.client) } })}
                        onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-1px)";e.currentTarget.style.boxShadow="0 8px 20px rgba(0,0,0,0.2)"}}
                        onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="none"}}
                        style={{ 
                          width: "100%", marginTop: "8px", padding: "10px", 
                          background: "linear-gradient(135deg, #7c3aed, #4f46e5)", 
                          border: "none", borderRadius: "10px", color: "#fff", 
                          fontWeight: 600, cursor: "pointer", transition: "all 0.2s" 
                        }}
                      >
                        Chat
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* ── MY JOBS ── */}
          {activeTab === "myjobs" && (
            <div>
              <h2 style={{ color: isDark ? "#fff" : "#1a1a2e", marginBottom: "16px" }}>My Jobs ({myJobs.length})</h2>
              {myJobs.length === 0 ? (
                <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} style={{textAlign:"center",padding:"60px 20px"}}>
                  <div style={{fontSize:"3rem",marginBottom:"12px"}}>🚀</div>
                  <h3 style={{color: isDark ? "#fff" : "#1a1a2e"}}>No active jobs</h3>
                  <p style={{color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"}}>You haven't posted or accepted any jobs yet.</p>
                  <button 
                    onClick={() => setActiveTab("find")} 
                    onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-1px)";e.currentTarget.style.boxShadow="0 8px 20px rgba(0,0,0,0.2)"}}
                    onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="none"}}
                    style={{ marginTop: "12px", padding: "10px 20px", background: "linear-gradient(135deg, #7c3aed, #4f46e5)", border: "none", borderRadius: "10px", color: "white", cursor: "pointer", fontWeight: 600 }}
                  >
                    Find Jobs
                  </button>
                </motion.div>
              ) : myJobs.map((job, i) => {
                const isClient = String(job.client) === walletAddress;
                const isFreelancer = String(job.freelancer) === walletAddress && String(job.freelancer) !== String(job.client);
                const statusKey = getStatusKey(job.status);
                const statusInfo = STATUS_COLORS[statusKey] || STATUS_COLORS[0];
                return (
                  <motion.div 
                    key={job.id} 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08, duration: 0.3 }}
                    style={cardStyle}
                    onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 12px 30px rgba(99,102,241,0.15)"}}
                    onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow=isDark ? "0 10px 30px rgba(0,0,0,0.2)" : "0 4px 24px rgba(0,0,0,0.08)"}}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
                      <div>
                        <h3 style={{ color: isDark ? "#fff" : "#1a1a2e", fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, marginBottom: "4px" }}>{job.title}</h3>
                        <p style={{ color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)", fontSize: "0.85rem" }}>{job.description}</p>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-block", padding: "4px 12px", borderRadius: "20px", background: statusInfo.bg, color: statusInfo.color, fontSize: "0.8rem", fontWeight: 600, marginBottom: "6px" }}>
                          {statusInfo.label}
                        </div>
                        <div style={{ color: "#34d399", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                          {(Number(job.amount) / 10_000_000).toFixed(2)} XLM
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: "0.75rem", color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.5)", marginBottom: "12px" }}>
                      {isClient ? "Client" : "Freelancer"} • Job #{job.id}
                      {!isClient && <> • Client: {shortenAddr(String(job.client))}</>}
                    </div>

                    {job.work_url && String(job.work_url) !== "" && (
                      <div style={{ padding: "12px", background: "rgba(99,102,241,0.1)", borderRadius: "12px", marginBottom: "12px", border: "1px solid rgba(99,102,241,0.2)" }}>
                        <p style={{ fontSize: "0.8rem", color: "#a5b4fc", marginBottom: "8px", fontWeight: 600 }}>Submitted Work:</p>
                        {/\.(jpg|jpeg|png|gif|webp)$/i.test(String(job.work_url)) ? (
                          <div>
                            <img src={String(job.work_url)} alt="Work preview" style={{ width: "100%", maxHeight: "200px", objectFit: "cover", borderRadius: "8px", marginBottom: "8px", cursor: "pointer" }} onClick={() => window.open(String(job.work_url), "_blank")} />
                            <a href={String(job.work_url)} target="_blank" rel="noopener noreferrer" style={{ color: "#818cf8", fontSize: "0.8rem" }}>🔗 Open full image</a>
                          </div>
                        ) : /\.pdf$/i.test(String(job.work_url)) ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <div>
                              <p style={{ margin: 0, fontSize: "0.85rem", color: isDark ? "#fff" : "#1a1a2e" }}>PDF Document</p>
                              <a href={String(job.work_url)} target="_blank" rel="noopener noreferrer" style={{ color: "#818cf8", fontSize: "0.8rem" }}>🔗 Open PDF</a>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <a href={String(job.work_url)} target="_blank" rel="noopener noreferrer" style={{ color: "#818cf8", fontSize: "0.85rem", wordBreak: "break-all", overflowWrap: "break-word" }}>{String(job.work_url)}</a>
                          </div>
                        )}
                      </div>
                    )}

                    {isFreelancer && isInProgressStatus(job.status) && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <p style={{ fontSize: "0.85rem", color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)", margin: 0 }}>Submit your work:</p>

                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          <input
                            value={submitJobId === job.id ? workUrl : ""}
                            onChange={(e) => { setWorkUrl(e.target.value); setSubmitJobId(job.id); }}
                            placeholder="Paste link (GitHub, Drive, IPFS...)"
                            style={{ flex: 1, minWidth: "200px", ...inputStyle }}
                          />
                        </div>

                        <div
                          style={{
                            border: isDark ? "2px dashed rgba(255,255,255,0.15)" : "2px dashed rgba(0,0,0,0.15)",
                            borderRadius: "12px", padding: "16px", textAlign: "center", cursor: "pointer", transition: "all 0.2s",
                          }}
                          onClick={() => document.getElementById(`file-upload-${job.id}`).click()}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            const file = e.dataTransfer.files[0];
                            if (file) handleFileUpload(file, job.id);
                          }}
                        >
                          <input
                            id={`file-upload-${job.id}`} type="file" accept="image/*,.pdf,.doc,.docx,.txt" style={{ display: "none" }}
                            onChange={(e) => { const file = e.target.files[0]; if (file) handleFileUpload(file, job.id); }}
                          />
                          <p style={{ margin: 0, color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)", fontSize: "0.85rem" }}>Click to upload or drag & drop</p>
                        </div>

                        {uploadStatus[job.id] && (
                          <div style={{
                            padding: "8px 12px", borderRadius: "8px", fontSize: "0.8rem",
                            background: uploadStatus[job.id].type === "success" ? "rgba(16,185,129,0.1)" : uploadStatus[job.id].type === "error" ? "rgba(239,68,68,0.1)" : "rgba(99,102,241,0.1)",
                            color: uploadStatus[job.id].type === "success" ? "#34d399" : uploadStatus[job.id].type === "error" ? "#f87171" : "#a5b4fc",
                            border: `1px solid ${uploadStatus[job.id].type === "success" ? "rgba(16,185,129,0.3)" : uploadStatus[job.id].type === "error" ? "rgba(239,68,68,0.3)" : "rgba(99,102,241,0.3)"}`,
                          }}>
                            {uploadStatus[job.id].message}
                          </div>
                        )}

                        <button
                          onClick={() => handleSubmitWork(job.id)}
                          disabled={loading || (!workUrl.trim() && submitJobId !== job.id)}
                          onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-1px)";e.currentTarget.style.boxShadow="0 8px 20px rgba(0,0,0,0.2)"}}
                          onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="none"}}
                          style={{
                            padding: "10px 20px", background: "linear-gradient(135deg, #f59e0b, #d97706)",
                            border: "none", borderRadius: "10px", color: "#fff", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
                            opacity: (!workUrl.trim() && submitJobId !== job.id) ? 0.5 : 1, transition: "all 0.2s"
                          }}
                        >
                          {loading ? spinner : "Submit Work"}
                        </button>
                      </div>
                    )}

                    <div style={{display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "12px"}}>
                      {isClient && isSubmittedStatus(job.status) && (
                        <button 
                          onClick={() => handleApproveJob(job.id)} 
                          disabled={loading} 
                          onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-1px)";e.currentTarget.style.boxShadow="0 8px 20px rgba(0,0,0,0.2)"}}
                          onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="none"}}
                          style={{ padding: "10px 24px", background: "linear-gradient(135deg, #059669, #047857)", border: "none", borderRadius: "10px", color: "#fff", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", transition: "all 0.2s" }}
                        >
                          {loading ? spinner : "Approve & Release Payment"}
                        </button>
                      )}
                      {isClient && isOpenStatus(job.status) && (
                        <button 
                          onClick={() => handleCancelJob(job.id)} 
                          disabled={loading} 
                          onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-1px)";e.currentTarget.style.boxShadow="0 8px 20px rgba(0,0,0,0.2)"}}
                          onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="none"}}
                          style={{ padding: "10px 24px", background: "linear-gradient(135deg, #dc2626, #b91c1c)", border: "none", borderRadius: "10px", color: "#fff", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", transition: "all 0.2s" }}
                        >
                          {loading ? spinner : "Cancel & Refund XLM"}
                        </button>
                      )}
                      <button
                        onClick={() => {
                          const chatWith = isClient ? String(job.freelancer) : String(job.client);
                          navigate("/chat", { state: { recipientAddress: chatWith } });
                        }}
                        onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-1px)";e.currentTarget.style.boxShadow="0 8px 20px rgba(0,0,0,0.2)"}}
                        onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="none"}}
                        style={{ padding: "10px 20px", background: "linear-gradient(135deg, #7c3aed, #4f46e5)", border: "none", borderRadius: "10px", color: "#fff", fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}>
                        {isClient ? "Chat with Freelancer" : "Chat with Client"}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
