import React, { useState, useEffect } from "react";
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

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  0:          { bg: "rgba(59,130,246,0.15)",  color: "#60a5fa", label: "🔵 Open" },
  1:          { bg: "rgba(234,179,8,0.15)",   color: "#facc15", label: "🟡 In Progress" },
  2:          { bg: "rgba(249,115,22,0.15)",  color: "#fb923c", label: "🟠 Submitted" },
  3:          { bg: "rgba(16,185,129,0.15)",  color: "#34d399", label: "🟢 Completed" },
  4:          { bg: "rgba(239,68,68,0.15)",   color: "#f87171", label: "🔴 Cancelled" },
  Open:       { bg: "rgba(59,130,246,0.15)",  color: "#60a5fa", label: "🔵 Open" },
  InProgress: { bg: "rgba(234,179,8,0.15)",   color: "#facc15", label: "🟡 In Progress" },
  Submitted:  { bg: "rgba(249,115,22,0.15)",  color: "#fb923c", label: "🟠 Submitted" },
  Completed:  { bg: "rgba(16,185,129,0.15)",  color: "#34d399", label: "🟢 Completed" },
  Cancelled:  { bg: "rgba(239,68,68,0.15)",   color: "#f87171", label: "🔴 Cancelled" },
};

const shortenAddr = (addr) => {
  if (!addr || typeof addr !== "string") return "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
};

// ─── Status helpers ───────────────────────────────────────────────────────────
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
const isOpenStatus       = (s) => { const k = getStatusKey(s); return k === 0 || k === "Open"; };
const isInProgressStatus = (s) => { const k = getStatusKey(s); return k === 1 || k === "InProgress"; };
const isSubmittedStatus  = (s) => { const k = getStatusKey(s); return k === 2 || k === "Submitted"; };

// ─── Core: build → prepareTransaction → sign → submit → poll ─────────────────
// Uses rpc.prepareTransaction (handles simulation + resource fees in one call)
const buildSignSubmit = async (txUnsigned, walletType, label, onStatus) => {
  onStatus(`⏳ ${label}: preparing...`, "info");

  let prepared;
  try {
    prepared = await SOROBAN_SERVER.prepareTransaction(txUnsigned);
  } catch (e) {
    // prepareTransaction wraps simulation errors with the contract error message
    throw new Error(`${label} prepare failed: ${e.message}`);
  }

  onStatus(`✍️ ${label}: please sign in your wallet...`, "info");
  const signedXdr = await signTransaction(prepared.toXDR(), walletType, NETWORK, NETWORK_PASSPHRASE);
  if (!signedXdr) throw new Error(`${label}: signing cancelled.`);

  const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
  const response = await SOROBAN_SERVER.sendTransaction(signedTx);
  console.log(`[escrow] ${label} sent:`, response.status, response.hash);

  if (response.status === "ERROR") {
    throw new Error(`${label} error: ${JSON.stringify(response.errorResult ?? response)}`);
  }

  // Poll for confirmation
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const poll = await SOROBAN_SERVER.getTransaction(response.hash);
    console.log(`[escrow] ${label} poll ${i + 1}: ${poll.status}`);
    if (poll.status === "SUCCESS") return { hash: response.hash, retval: poll.returnValue };
    if (poll.status === "FAILED")  throw new Error(`${label} failed on-chain.`);
  }
  throw new Error(`${label} timed out. Hash: ${response.hash}`);
};

// ─── EscrowPage ───────────────────────────────────────────────────────────────
export default function EscrowPage({
  walletAddress, server,
  onJobPosted, onJobAccepted, onWorkSubmitted, onPaymentReleased,
}) {
  const { walletType } = useWallet();
  const { isDark } = useTheme();

  const [activeTab, setActiveTab]   = useState("post");
  const [jobs, setJobs]             = useState([]);
  const [loading, setLoading]       = useState(false);
  const [status, setStatus]         = useState("");
  const [statusType, setStatusType] = useState("info");

  // Form state
  const [title, setTitle]           = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount]         = useState("");
  const [workUrl, setWorkUrl]       = useState("");
  const [submitJobId, setSubmitJobId] = useState(null);

  // ── Status helper ─────────────────────────────────────────────────────────
  const showStatus = (msg, type = "info") => {
    setStatus(msg);
    setStatusType(type);
    if (type === "success") setTimeout(() => setStatus(""), 6000);
  };

  // ── Load all jobs via simulation (no wallet needed) ───────────────────────
  const loadJobs = async () => {
    try {
      setLoading(true);
      const dummyAccount = new StellarSdk.Account(walletAddress, "0");

      // get_total
      const totalTx = new StellarSdk.TransactionBuilder(dummyAccount, {
        fee: "100", networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          StellarSdk.Operation.invokeContractFunction({
            contract: ESCROW_CONTRACT_ID, function: "get_total", args: [],
          })
        )
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
            .addOperation(
              StellarSdk.Operation.invokeContractFunction({
                contract: ESCROW_CONTRACT_ID, function: "get_job",
                args: [StellarSdk.nativeToScVal(id, { type: "u32" })],
              })
            )
            .setTimeout(30).build();

          const jobSim = await SOROBAN_SERVER.simulateTransaction(jobTx);
          if (jobSim?.result?.retval) {
            const job = StellarSdk.scValToNative(jobSim.result.retval);
            jobList.push({ ...job, id });
          }
        } catch (e) {
          console.error("Job load error", id, e);
        }
      }
      setJobs(jobList);
      console.log("Loaded jobs:", jobList.length, jobList);
    } catch (e) {
      console.error("loadJobs error:", e);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (walletAddress) loadJobs(); }, [walletAddress]); // eslint-disable-line

  // ── 1. POST JOB ───────────────────────────────────────────────────────────
  // FIX: Two steps required for Stellar SAC (native XLM token):
  //   TX 1 → approve() on the XLM SAC: lets escrow contract pull `amount` from client
  //   TX 2 → post_job() on escrow contract: locks XLM and creates the job
  //
  // Without TX 1, the contract's token.transfer() throws:
  //   Error(WasmVm, UnexpectedSize) → Func(MismatchingParameterLen)  ← your original error
  const handlePostJob = async () => {
    if (!title.trim())       { showStatus("Please enter a job title!", "error"); return; }
    if (!description.trim()) { showStatus("Please enter a description!", "error"); return; }
    const xlm = parseFloat(amount);
    if (!xlm || xlm <= 0)    { showStatus("Please enter a valid XLM amount!", "error"); return; }
    if (!walletType)         { showStatus("Wallet not connected.", "error"); return; }

    const amountStroops = Math.round(xlm * 10_000_000);
    // Fetch current ledger + 500 (~42 min). Cannot use large hardcoded value —
    // SAC enforces max_entry_ttl limit. Error: "live_until is greater than max"
    const ledgerInfo = await SOROBAN_SERVER.getLatestLedger();
    const EXPIRY_LEDGER = ledgerInfo.sequence + 500;

    setLoading(true);
    try {
      // ── TX 1: approve() on Native XLM SAC ──────────────────────────────
      // Signature: approve(from: Address, spender: Address, amount: i128, expiration_ledger: u32)
      showStatus("Step 1 of 2: Approving XLM transfer — please sign...", "info");

      const approveAccount = await SOROBAN_SERVER.getAccount(walletAddress);
      const approveTx = new StellarSdk.TransactionBuilder(approveAccount, {
        fee: "1000000", networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          new StellarSdk.Contract(NATIVE_XLM_TOKEN).call(
            "approve",
            new StellarSdk.Address(walletAddress).toScVal(),         // from
            new StellarSdk.Address(ESCROW_CONTRACT_ID).toScVal(),    // spender (escrow)
            StellarSdk.nativeToScVal(amountStroops, { type: "i128" }), // amount
            StellarSdk.nativeToScVal(EXPIRY_LEDGER, { type: "u32" })   // expiration_ledger
          )
        )
        .setTimeout(300).build();

      await buildSignSubmit(approveTx, walletType, "approve", showStatus);
      console.log("[escrow] approve ✅");

      // ── TX 2: post_job() on Escrow contract ────────────────────────────
      // Signature: post_job(client, title, description, amount, token_address) → u32
      showStatus("Step 2 of 2: Posting job — please sign...", "info");

      const postAccount = await SOROBAN_SERVER.getAccount(walletAddress);
      const postTx = new StellarSdk.TransactionBuilder(postAccount, {
        fee: "1000000", networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          new StellarSdk.Contract(ESCROW_CONTRACT_ID).call(
            "post_job",
            new StellarSdk.Address(walletAddress).toScVal(),                   // client
            StellarSdk.nativeToScVal(title.trim(), { type: "string" }),        // title
            StellarSdk.nativeToScVal(description.trim(), { type: "string" }),  // description
            StellarSdk.nativeToScVal(amountStroops, { type: "i128" })          // amount
            // token_address removed — deployed contract does not have this param
          )
        )
        .setTimeout(300).build();

      await buildSignSubmit(postTx, walletType, "post_job", showStatus);
      console.log("[escrow] post_job ✅");

      showStatus("✅ Job posted! XLM locked in escrow.", "success");
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

  // ── 2. ACCEPT JOB ─────────────────────────────────────────────────────────
  // Signature: accept_job(freelancer, job_id)
  const handleAcceptJob = async (jobId) => {
    setLoading(true);
    try {
      const account = await SOROBAN_SERVER.getAccount(walletAddress);
      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: "1000000", networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          new StellarSdk.Contract(ESCROW_CONTRACT_ID).call(
            "accept_job",
            new StellarSdk.Address(walletAddress).toScVal(),      // freelancer
            StellarSdk.nativeToScVal(jobId, { type: "u32" })      // job_id
          )
        )
        .setTimeout(300).build();

      await buildSignSubmit(tx, walletType, "accept_job", showStatus);
      showStatus("✅ Job accepted! You are now the assigned freelancer.", "success");
      await loadJobs();
      onJobAccepted?.(jobId);
    } catch (e) {
      console.error("[escrow] accept_job error:", e);
      showStatus(`❌ ${e.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  // ── 3. SUBMIT WORK ────────────────────────────────────────────────────────
  // Signature: submit_work(freelancer, job_id, work_url)
  const handleSubmitWork = async (jobId) => {
    if (!workUrl.trim()) { showStatus("Please enter a work URL!", "error"); return; }
    setLoading(true);
    try {
      const account = await SOROBAN_SERVER.getAccount(walletAddress);
      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: "1000000", networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          new StellarSdk.Contract(ESCROW_CONTRACT_ID).call(
            "submit_work",
            new StellarSdk.Address(walletAddress).toScVal(),           // freelancer
            StellarSdk.nativeToScVal(jobId, { type: "u32" }),          // job_id
            StellarSdk.nativeToScVal(workUrl.trim(), { type: "string" }) // work_url
          )
        )
        .setTimeout(300).build();

      await buildSignSubmit(tx, walletType, "submit_work", showStatus);
      showStatus("✅ Work submitted! Waiting for client approval.", "success");
      setWorkUrl(""); setSubmitJobId(null);
      await loadJobs();
      onWorkSubmitted?.(jobId);
    } catch (e) {
      console.error("[escrow] submit_work error:", e);
      showStatus(`❌ ${e.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  // ── 4. APPROVE AND PAY ────────────────────────────────────────────────────
  // Signature: approve_job(client, job_id)  ← deployed contract uses this name
  // Contract internally calls token.transfer(contract → freelancer)
  // No approve needed here — contract already holds the XLM
  const handleApproveJob = async (jobId) => {
    setLoading(true);
    try {
      const job = jobs.find((j) => j.id === jobId);
      if (!job) throw new Error("Job not found in local state.");

      // Step 1: Release payment
      showStatus("⏳ Releasing XLM payment — please sign...", "info");
      const account = await SOROBAN_SERVER.getAccount(walletAddress);
      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: "1000000", networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          new StellarSdk.Contract(ESCROW_CONTRACT_ID).call(
            "approve_job",                                          // ← was "approve_and_pay"
            new StellarSdk.Address(walletAddress).toScVal(),       // client
            StellarSdk.nativeToScVal(jobId, { type: "u32" })       // job_id
          )
        )
        .setTimeout(300).build();

      await buildSignSubmit(tx, walletType, "approve_job", showStatus);
      showStatus("✅ XLM released! Minting NFT certificate...", "success");

      // Step 2: Mint NFT certificate for freelancer (non-fatal if fails)
      try {
        const freelancer = String(job.freelancer);
        const nftAccount = await SOROBAN_SERVER.getAccount(walletAddress);
        const nftTx = new StellarSdk.TransactionBuilder(nftAccount, {
          fee: "1000000", networkPassphrase: NETWORK_PASSPHRASE,
        })
          .addOperation(
            new StellarSdk.Contract(CONTRACT_ID).call(
              "mint_nft",
              // Deployed contract: minter, owner, name, image_url
              new StellarSdk.Address(walletAddress).toScVal(),    // minter
              new StellarSdk.Address(freelancer).toScVal(),       // owner (freelancer)
              StellarSdk.nativeToScVal(`Job Certificate: ${job.title}`, { type: "string" }), // name
              StellarSdk.nativeToScVal(                           // image_url (work URL as proof)
                job.work_url && String(job.work_url) !== ""
                  ? String(job.work_url)
                  : "https://gateway.pinata.cloud/ipfs/Qmcertificate",
                { type: "string" }
              )
            )
          )
          .setTimeout(300).build();

        await buildSignSubmit(nftTx, walletType, "mint_nft (certificate)", showStatus);
        showStatus("🎉 XLM sent + NFT Certificate minted for freelancer!", "success");
      } catch (nftErr) {
        console.error("[escrow] NFT mint error (non-fatal):", nftErr);
        showStatus("✅ XLM sent! (NFT cert failed — non-fatal)", "success");
      }

      await loadJobs();
      onPaymentReleased?.(jobId);

    } catch (e) {
      console.error("[escrow] approve_job error:", e);
      showStatus(`❌ ${e.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  // ── 5. CANCEL JOB ─────────────────────────────────────────────────────────
  // FIX: lib.rs cancel_job signature is: cancel_job(client, job_id) — only 2 args!
  // Your old code was passing 3 args (client, job_id, token) which caused a mismatch.
  const handleCancelJob = async (jobId) => {
    setLoading(true);
    try {
      showStatus("⏳ Cancelling job & refunding XLM — please sign...", "info");
      const account = await SOROBAN_SERVER.getAccount(walletAddress);
      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: "1000000", networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          new StellarSdk.Contract(ESCROW_CONTRACT_ID).call(
            "cancel_job",
            new StellarSdk.Address(walletAddress).toScVal(),   // client
            StellarSdk.nativeToScVal(jobId, { type: "u32" })   // job_id
            // ← NO token_address arg — contract reads it from stored Job struct
          )
        )
        .setTimeout(300).build();

      await buildSignSubmit(tx, walletType, "cancel_job", showStatus);
      showStatus("✅ Job cancelled — XLM refunded to your wallet!", "success");
      await loadJobs();
      onPaymentReleased?.(jobId);
    } catch (e) {
      console.error("[escrow] cancel_job error:", e);
      showStatus(`❌ ${e.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  // ── Derived lists ─────────────────────────────────────────────────────────
  const openJobs = jobs.filter((j) => isOpenStatus(j.status));
  const myJobs   = jobs.filter((j) => {
    const isMyClient     = j.client === walletAddress;
    const isFreelancer   = j.freelancer === walletAddress && j.freelancer !== j.client;
    return isMyClient || isFreelancer;
  });

  const tabs = [
    { id: "post",   label: "📝 Post Job" },
    { id: "find",   label: "🔍 Find Jobs" },
    { id: "myjobs", label: "💼 My Jobs" },
  ];

  // ── Shared styles ─────────────────────────────────────────────────────────
  const inputStyle = {
    width: "100%", padding: "12px 16px", borderRadius: "12px",
    background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
    border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.12)",
    color: isDark ? "#fff" : "#1a1a2e", fontSize: "0.95rem",
    outline: "none", boxSizing: "border-box",
  };
  const cardStyle = {
    background: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.9)",
    border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)",
    borderRadius: "16px", padding: "20px", marginBottom: "12px",
    boxShadow: isDark ? "0 25px 50px rgba(88,28,135,0.4)" : "0 4px 24px rgba(0,0,0,0.08)",
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      style={{ maxWidth: "900px", margin: "0 auto", padding: "20px 16px" }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 700, letterSpacing: "-0.03em", color: isDark ? "#fff" : "#1a1a2e" }}>
          Freelancer <span style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Escrow</span>
        </h1>
        <p style={{ color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)", marginTop: '4px' }}>
          Safe payments on Stellar blockchain
        </p>
        <div style={{ width: "48px", height: "3px", background: "linear-gradient(135deg, #8b5cf6, #3b82f6)", borderRadius: "2px", margin: '8px auto 0' }} />
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
            }}>{status}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "24px", background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)", padding: "6px", borderRadius: "16px", border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)" }}>
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            flex: 1, padding: "10px", borderRadius: "12px", border: "none", cursor: "pointer",
            fontWeight: 600, fontSize: "0.85rem", transition: "all 0.2s",
            background: activeTab === tab.id ? "linear-gradient(135deg, #7c3aed, #4f46e5)" : "transparent",
            color: activeTab === tab.id ? "#fff" : (isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"),
          }}>{tab.label}</button>
        ))}
      </div>

      {/* ── POST JOB ────────────────────────────────────────────────────────── */}
      {activeTab === "post" && (
        <div style={{ ...cardStyle, padding: "28px" }}>
          <h2 style={{ color: isDark ? "#fff" : "#1a1a2e", marginBottom: "24px" }}>📝 Post a New Job</h2>
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
                💡 {amount} XLM will be locked in escrow until job completion
              </div>
            )}

            {/* Two-step notice */}
            <div style={{ padding: "12px 16px", background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: "12px", fontSize: "0.8rem", color: "#60a5fa" }}>
              ℹ️ This requires <strong>2 wallet signatures</strong>:<br />
              &nbsp;&nbsp;1️⃣ Approve XLM transfer to escrow contract<br />
              &nbsp;&nbsp;2️⃣ Post job &amp; lock XLM on-chain
            </div>

            <button onClick={handlePostJob} disabled={loading} style={{
              padding: "14px",
              background: loading ? "rgba(124,58,237,0.3)" : "linear-gradient(135deg, #7c3aed, #4f46e5)",
              border: "none", borderRadius: "14px", color: "#fff", fontWeight: 700, fontSize: "1rem",
              cursor: loading ? "not-allowed" : "pointer",
            }}>
              {loading ? "⏳ Processing..." : "🔒 Post Job & Lock XLM"}
            </button>
          </div>
        </div>
      )}

      {/* ── FIND JOBS ────────────────────────────────────────────────────────── */}
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
            <div style={{ textAlign: "center", padding: "40px", ...cardStyle, color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)" }}>
              😔 No open jobs yet. Post one!
            </div>
          ) : openJobs.map((job) => (
            <div key={job.id} style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                <div>
                  <h3 style={{ color: isDark ? "#fff" : "#1a1a2e", marginBottom: "6px" }}>{job.title}</h3>
                  <p style={{ color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)", fontSize: "0.85rem", marginBottom: "6px" }}>{job.description}</p>
                  <p style={{ color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.5)", fontSize: "0.75rem" }}>Client: {shortenAddr(String(job.client))}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: "#34d399", fontWeight: 700, fontSize: "1.1rem", marginBottom: "8px" }}>
                    {(Number(job.amount) / 10_000_000).toFixed(2)} XLM
                  </div>
                  {String(job.client) !== walletAddress ? (
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

      {/* ── MY JOBS ──────────────────────────────────────────────────────────── */}
      {activeTab === "myjobs" && (
        <div>
          <h2 style={{ color: isDark ? "#fff" : "#1a1a2e", marginBottom: "16px" }}>💼 My Jobs ({myJobs.length})</h2>
          {myJobs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", ...cardStyle, color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)" }}>
              😔 No jobs yet! Post or accept a job.
            </div>
          ) : myJobs.map((job) => {
            const isClient     = String(job.client)     === walletAddress;
            const isFreelancer = String(job.freelancer) === walletAddress && String(job.freelancer) !== String(job.client);
            const statusKey    = getStatusKey(job.status);
            const statusInfo   = STATUS_COLORS[statusKey] || STATUS_COLORS[0];

            return (
              <div key={job.id} style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
                  <div>
                    <h3 style={{ color: isDark ? "#fff" : "#1a1a2e", marginBottom: "4px" }}>{job.title}</h3>
                    <p style={{ color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)", fontSize: "0.85rem" }}>{job.description}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-block", padding: "4px 12px", borderRadius: "20px", background: statusInfo.bg, color: statusInfo.color, fontSize: "0.8rem", fontWeight: 600, marginBottom: "6px" }}>
                      {statusInfo.label}
                    </div>
                    <div style={{ color: "#34d399", fontWeight: 700 }}>
                      {(Number(job.amount) / 10_000_000).toFixed(2)} XLM
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: "0.75rem", color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.5)", marginBottom: "12px" }}>
                  {isClient ? "👤 You are Client" : "💼 You are Freelancer"} • Job #{job.id}
                  {!isClient && <> • Client: {shortenAddr(String(job.client))}</>}
                </div>

                {job.work_url && String(job.work_url) !== "" && (
                  <div style={{ padding: "8px 12px", background: "rgba(99,102,241,0.1)", borderRadius: "8px", marginBottom: "12px", fontSize: "0.8rem", color: "#a5b4fc" }}>
                    📎 Work: <a href={String(job.work_url)} target="_blank" rel="noopener noreferrer" style={{ color: "#818cf8" }}>{String(job.work_url)}</a>
                  </div>
                )}

                {/* Freelancer: submit work when InProgress */}
                {isFreelancer && isInProgressStatus(job.status) && (
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <input
                      value={submitJobId === job.id ? workUrl : ""}
                      onChange={(e) => { setWorkUrl(e.target.value); setSubmitJobId(job.id); }}
                      placeholder="Enter work URL or IPFS link..."
                      style={{ flex: 1, minWidth: "200px", ...inputStyle }}
                    />
                    <button onClick={() => handleSubmitWork(job.id)} disabled={loading} style={{ padding: "10px 20px", background: "linear-gradient(135deg, #f59e0b, #d97706)", border: "none", borderRadius: "10px", color: "#fff", fontWeight: 600, cursor: "pointer" }}>
                      📤 Submit Work
                    </button>
                  </div>
                )}

                {/* Client: approve payment when Submitted */}
                {isClient && isSubmittedStatus(job.status) && (
                  <button onClick={() => handleApproveJob(job.id)} disabled={loading} style={{ padding: "10px 24px", background: "linear-gradient(135deg, #059669, #047857)", border: "none", borderRadius: "10px", color: "#fff", fontWeight: 600, cursor: "pointer", marginRight: "8px" }}>
                    ✅ Approve & Release Payment
                  </button>
                )}

                {/* Client: cancel when Open */}
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