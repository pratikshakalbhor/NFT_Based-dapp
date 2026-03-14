import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as StellarSdk from "@stellar/stellar-sdk";
import { useWallet } from "../WalletContext";
import { signTransaction } from "../walletService";
import { NETWORK, NETWORK_PASSPHRASE, ESCROW_CONTRACT_ID } from "../constants";

const STATUS_COLORS = {
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

export default function EscrowPage({ walletAddress }) {
  const { walletType } = useWallet();
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
    if (StellarSdk.rpc && StellarSdk.rpc.Server) {
      return new StellarSdk.rpc.Server(RPC_URL);
    }
    if (StellarSdk.SorobanRpc && StellarSdk.SorobanRpc.Server) {
      return new StellarSdk.SorobanRpc.Server(RPC_URL);
    }
    throw new Error("SorobanRpc not available in this SDK version");
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

      // Get total jobs
      const totalTx = new StellarSdk.TransactionBuilder(account, {
        fee: "100",
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          StellarSdk.Operation.invokeContractFunction({
            contract: ESCROW_CONTRACT_ID,
            function: "get_total",
            args: [],
          })
        )
        .setTimeout(30)
        .build();

      const totalSim = await rpc.simulateTransaction(totalTx);
      if (!totalSim?.result?.retval) { setJobs([]); return; }

      const total = StellarSdk.scValToNative(totalSim.result.retval);
      const jobList = [];

      for (let i = 1; i <= Number(total); i++) {
        try {
          const jobTx = new StellarSdk.TransactionBuilder(account, {
            fee: "100",
            networkPassphrase: NETWORK_PASSPHRASE,
          })
            .addOperation(
              StellarSdk.Operation.invokeContractFunction({
                contract: ESCROW_CONTRACT_ID,
                function: "get_job",
                args: [StellarSdk.nativeToScVal(i, { type: "u32" })],
              })
            )
            .setTimeout(30)
            .build();

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
      fee: "100000",
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        StellarSdk.Operation.invokeContractFunction({
          contract: ESCROW_CONTRACT_ID,
          function: method,
          args,
        })
      )
      .setTimeout(60)
      .build();

    const prepared = await rpc.prepareTransaction(tx);
    const xdr = prepared.toXDR();
    const signedXdr = await signTransaction(xdr, walletType, NETWORK, NETWORK_PASSPHRASE);
    const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
    const result = await rpc.sendTransaction(signedTx);

    // Poll for confirmation
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 1500));
      const poll = await rpc.getTransaction(result.hash);
      if (poll.status !== "NOT_FOUND") return poll;
    }
    return result;
  };

  const handlePostJob = async () => {
    if (!title || !description || !amount) {
      showStatus("Please fill all the fields", "error");
      return;
    }
    try {
      setLoading(true);
      showStatus("Job posting... ", "info");
      await invokeContract("post_job", [
        StellarSdk.nativeToScVal(walletAddress, { type: "address" }),
        StellarSdk.nativeToScVal(title, { type: "string" }),
        StellarSdk.nativeToScVal(description, { type: "string" }),
        StellarSdk.nativeToScVal(Math.floor(parseFloat(amount) * 10_000_000), { type: "i128" }),
      ]);
      showStatus(" Job posted successfully!", "success");
      setTitle(""); setDescription(""); setAmount("");
      await loadJobs();
      setActiveTab("find");
    } catch (e) {
      showStatus(`Error: ${e.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptJob = async (jobId) => {
    try {
      setLoading(true);
      showStatus("Accepting job...", "info");
      await invokeContract("accept_job", [
        StellarSdk.nativeToScVal(walletAddress, { type: "address" }),
        StellarSdk.nativeToScVal(jobId, { type: "u32" }),
      ]);
      showStatus(" Job accepted!", "success");
      await loadJobs();
    } catch (e) {
      showStatus(` Error: ${e.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitWork = async (jobId) => {
    if (!workUrl) { showStatus("Please enter the work URL", "error"); return; }
    try {
      setLoading(true);
      showStatus("Submitting work...", "info");
      await invokeContract("submit_work", [
        StellarSdk.nativeToScVal(walletAddress, { type: "address" }),
        StellarSdk.nativeToScVal(jobId, { type: "u32" }),
        StellarSdk.nativeToScVal(workUrl, { type: "string" }),
      ]);
      showStatus(" Work submitted!", "success");
      setWorkUrl(""); setSubmitJobId(null);
      await loadJobs();
    } catch (e) {
      showStatus(` Error: ${e.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveJob = async (jobId) => {
    try {
      setLoading(true);
      showStatus("Approving...", "info");
      await invokeContract("approve_job", [
        StellarSdk.nativeToScVal(walletAddress, { type: "address" }),
        StellarSdk.nativeToScVal(jobId, { type: "u32" }),
      ]);
      showStatus(" Payment released!", "success");
      await loadJobs();
    } catch (e) {
      showStatus(` Error: ${e.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (walletAddress) loadJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletAddress]);

  const openJobs = jobs.filter(j => {
    const s = typeof j.status === "string" ? j.status : Object.keys(j.status || {})[0];
    return s === "Open";
  });

  const myJobs = jobs.filter(j =>
    j.client === walletAddress || j.freelancer === walletAddress
  );

  const getStatus = (job) => {
    if (typeof job.status === "string") return job.status;
    return Object.keys(job.status || {})[0] || "Open";
  };

  const tabs = [
    { id: "post", label: " Post Job" },
    { id: "find", label: " Find Jobs" },
    { id: "myjobs", label: " My Jobs" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ maxWidth: "900px", margin: "0 auto", padding: "20px 16px" }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "32px" }}>
        <h1 style={{
          fontSize: "clamp(1.8rem, 4vw, 2.5rem)", fontWeight: 800,
          background: "linear-gradient(135deg, #a78bfa, #60a5fa)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          marginBottom: "8px",
        }}> Freelancer Escrow</h1>
        <p style={{ color: "rgba(255,255,255,0.5)" }}>Safe payments on Stellar blockchain</p>
      </div>

      {/* Status */}
      <AnimatePresence>
        {status && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{
              padding: "12px 16px", borderRadius: "12px", marginBottom: "20px",
              background: statusType === "success" ? "rgba(16,185,129,0.1)" :
                          statusType === "error" ? "rgba(239,68,68,0.1)" : "rgba(99,102,241,0.1)",
              border: `1px solid ${statusType === "success" ? "rgba(16,185,129,0.3)" :
                                   statusType === "error" ? "rgba(239,68,68,0.3)" : "rgba(99,102,241,0.3)"}`,
              color: statusType === "success" ? "#34d399" : statusType === "error" ? "#f87171" : "#a5b4fc",
            }}
          >{status}</motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div style={{
        display: "flex", gap: "8px", marginBottom: "24px",
        background: "rgba(255,255,255,0.03)", padding: "6px",
        borderRadius: "16px", border: "1px solid rgba(255,255,255,0.08)",
      }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            flex: 1, padding: "10px", borderRadius: "12px", border: "none",
            cursor: "pointer", fontWeight: 600, fontSize: "0.85rem", transition: "all 0.2s",
            background: activeTab === tab.id ? "linear-gradient(135deg, #7c3aed, #4f46e5)" : "transparent",
            color: activeTab === tab.id ? "#fff" : "rgba(255,255,255,0.5)",
          }}>{tab.label}</button>
        ))}
      </div>

      {/* POST JOB */}
      {activeTab === "post" && (
        <div style={{
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "20px", padding: "28px",
        }}>
          <h2 style={{ color: "#fff", marginBottom: "24px" }}> Post a New Job</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {[
              { label: "Job Title", val: title, set: setTitle, placeholder: "e.g. Logo Design..." },
            ].map(({ label, val, set, placeholder }) => (
              <div key={label}>
                <label style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.85rem", marginBottom: "8px", display: "block" }}>{label}</label>
                <input value={val} onChange={e => set(e.target.value)} placeholder={placeholder} disabled={loading}
                  style={{ width: "100%", padding: "12px 16px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#fff", fontSize: "0.95rem", outline: "none", boxSizing: "border-box" }}
                />
              </div>
            ))}
            <div>
              <label style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.85rem", marginBottom: "8px", display: "block" }}>Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the job..." rows={3} disabled={loading}
                style={{ width: "100%", padding: "12px 16px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#fff", fontSize: "0.95rem", outline: "none", resize: "vertical", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.85rem", marginBottom: "8px", display: "block" }}>Amount (XLM)</label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="100" min="1" disabled={loading}
                style={{ width: "100%", padding: "12px 16px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#fff", fontSize: "0.95rem", outline: "none", boxSizing: "border-box" }}
              />
            </div>
            {amount && (
              <div style={{ padding: "12px 16px", background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: "12px", color: "#a78bfa", fontSize: "0.85rem" }}>
                💡 {amount} XLM will be locked in escrow
              </div>
            )}
            <button onClick={handlePostJob} disabled={loading} style={{
              padding: "14px", background: loading ? "rgba(124,58,237,0.3)" : "linear-gradient(135deg, #7c3aed, #4f46e5)",
              border: "none", borderRadius: "14px", color: "#fff", fontWeight: 700, fontSize: "1rem", cursor: loading ? "not-allowed" : "pointer",
            }}>
              {loading ? " Processing..." : " Post Job & Lock XLM"}
            </button>
          </div>
        </div>
      )}

      {/* FIND JOBS */}
      {activeTab === "find" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 style={{ color: "#fff" }}>🔍 Open Jobs ({openJobs.length})</h2>
            <button onClick={loadJobs} disabled={loading} style={{ padding: "8px 16px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "#a78bfa", cursor: "pointer" }}>
               Refresh
            </button>
          </div>
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px", color: "rgba(255,255,255,0.4)" }}> Loading...</div>
          ) : openJobs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "20px", color: "rgba(255,255,255,0.4)" }}>
               No open jobs. Post one!
            </div>
          ) : openJobs.map((job, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "20px", marginBottom: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                <div>
                  <h3 style={{ color: "#fff", marginBottom: "6px" }}>{job.title}</h3>
                  <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", marginBottom: "6px" }}>{job.description}</p>
                  <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.75rem" }}>Client: {shortenAddr(job.client)}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: "#34d399", fontWeight: 700, fontSize: "1.1rem", marginBottom: "8px" }}>
                    {(Number(job.amount) / 10_000_000).toFixed(2)} XLM
                  </div>
                  {job.client !== walletAddress && (
                    <button onClick={() => handleAcceptJob(job.id)} disabled={loading} style={{ padding: "8px 16px", background: "linear-gradient(135deg, #059669, #047857)", border: "none", borderRadius: "10px", color: "#fff", fontWeight: 600, cursor: "pointer" }}>
                       Accept Job
                    </button>
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
          <h2 style={{ color: "#fff", marginBottom: "16px" }}> My Jobs ({myJobs.length})</h2>
          {myJobs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "20px", color: "rgba(255,255,255,0.4)" }}>
               No jobs yet!
            </div>
          ) : myJobs.map((job, i) => {
            const isClient = job.client === walletAddress;
            const isFreelancer = job.freelancer === walletAddress && job.client !== walletAddress;
            const jobStatus = getStatus(job);
            const statusInfo = STATUS_COLORS[jobStatus] || STATUS_COLORS.Open;

            return (
              <div key={i} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "20px", marginBottom: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
                  <div>
                    <h3 style={{ color: "#fff", marginBottom: "4px" }}>{job.title}</h3>
                    <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem" }}>{job.description}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-block", padding: "4px 12px", borderRadius: "20px", background: statusInfo.bg, color: statusInfo.color, fontSize: "0.8rem", fontWeight: 600, marginBottom: "6px" }}>
                      {statusInfo.label}
                    </div>
                    <div style={{ color: "#34d399", fontWeight: 700 }}>{(Number(job.amount) / 10_000_000).toFixed(2)} XLM</div>
                  </div>
                </div>

                <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.3)", marginBottom: "12px" }}>
                  {isClient ? "👤 You are Client" : "💼 You are Freelancer"} • Job #{job.id}
                </div>

                {job.work_url && job.work_url !== "" && (
                  <div style={{ padding: "8px 12px", background: "rgba(99,102,241,0.1)", borderRadius: "8px", marginBottom: "12px", fontSize: "0.8rem", color: "#a5b4fc" }}>
                    📎 Work: <a href={job.work_url} target="_blank" rel="noopener noreferrer" style={{ color: "#818cf8" }}>{job.work_url}</a>
                  </div>
                )}

                {isFreelancer && jobStatus === "InProgress" && (
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <input
                      value={submitJobId === job.id ? workUrl : ""}
                      onChange={e => { setWorkUrl(e.target.value); setSubmitJobId(job.id); }}
                      placeholder="Enter work URL or IPFS link..."
                      style={{ flex: 1, minWidth: "200px", padding: "10px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "#fff", fontSize: "0.85rem", outline: "none" }}
                    />
                    <button onClick={() => handleSubmitWork(job.id)} disabled={loading} style={{ padding: "10px 20px", background: "linear-gradient(135deg, #f59e0b, #d97706)", border: "none", borderRadius: "10px", color: "#fff", fontWeight: 600, cursor: "pointer" }}>
                       Submit Work
                    </button>
                  </div>
                )}

                {isClient && jobStatus === "Submitted" && (
                  <button onClick={() => handleApproveJob(job.id)} disabled={loading} style={{ padding: "10px 24px", background: "linear-gradient(135deg, #059669, #047857)", border: "none", borderRadius: "10px", color: "#fff", fontWeight: 600, cursor: "pointer" }}>
                     Approve & Release Payment
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