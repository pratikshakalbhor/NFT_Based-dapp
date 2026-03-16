import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { containerVariants, itemVariants } from './ProfilePageAnimations';
import { CheckIcon, CopyIcon } from './ProfilePageIcons';
import { ESCROW_CONTRACT_ID, SOROBAN_SERVER, NETWORK_PASSPHRASE } from '../constants';
import * as StellarSdk from '@stellar/stellar-sdk';
import './ProfilePage.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const shortenKey = (key) => key ? `${key.slice(0, 6)}...${key.slice(-6)}` : '';

const generateAvatar = (address) => {
  if (!address) return '#6366f1';
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];
  const idx = address.charCodeAt(2) % colors.length;
  return colors[idx];
};

const getInitials = (address) => {
  if (!address) return '??';
  return address.slice(0, 2).toUpperCase();
};

// ─── ProfilePage ──────────────────────────────────────────────────────────────
const ProfilePage = ({ account, nfts, rewardBalance }) => {
  const { isDark } = useTheme();
  const [copied, setCopied] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  const xlmBalance = account?.balances?.find((b) => b.asset_type === 'native')?.balance || '0';
  const nftCount = nfts ? nfts.length : 0;
  const publicKey = account?.id || '';
  const avatarColor = generateAvatar(publicKey);

  // ── Load jobs from escrow contract ─────────────────────────────────────────
  useEffect(() => {
    if (!publicKey) return;
    const load = async () => {
      try {
        setLoadingJobs(true);
        const dummy = new StellarSdk.Account(publicKey, '0');
        const totalTx = new StellarSdk.TransactionBuilder(dummy, { fee: '100', networkPassphrase: NETWORK_PASSPHRASE })
          .addOperation(StellarSdk.Operation.invokeContractFunction({ contract: ESCROW_CONTRACT_ID, function: 'get_total', args: [] }))
          .setTimeout(30).build();
        const totalSim = await SOROBAN_SERVER.simulateTransaction(totalTx);
        if (!totalSim?.result?.retval) { setJobs([]); return; }
        const total = Number(StellarSdk.scValToNative(totalSim.result.retval));
        const list = [];
        for (let id = 1; id <= total; id++) {
          try {
            const jobTx = new StellarSdk.TransactionBuilder(dummy, { fee: '100', networkPassphrase: NETWORK_PASSPHRASE })
              .addOperation(StellarSdk.Operation.invokeContractFunction({
                contract: ESCROW_CONTRACT_ID, function: 'get_job',
                args: [StellarSdk.nativeToScVal(id, { type: 'u32' })],
              }))
              .setTimeout(30).build();
            const sim = await SOROBAN_SERVER.simulateTransaction(jobTx);
            if (sim?.result?.retval) {
              const job = StellarSdk.scValToNative(sim.result.retval);
              list.push({ ...job, id });
            }
          } catch { }
        }
        setJobs(list);
      } catch (e) {
        console.error('Profile jobs load error:', e);
      } finally {
        setLoadingJobs(false);
      }
    };
    load();
  }, [publicKey]);

  // ── Computed stats ──────────────────────────────────────────────────────────
  const getStatusKey = (s) => {
    if (!s) return 'Open';
    if (typeof s === 'string') return s;
    if (typeof s === 'object') return Object.keys(s)[0];
    return s;
  };

  const myPostedJobs = jobs.filter(j => String(j.client) === publicKey);
  const myFreelanceJobs = jobs.filter(j => String(j.freelancer) === publicKey && String(j.freelancer) !== String(j.client));
  const completedJobs = jobs.filter(j => getStatusKey(j.status) === 'Completed' && (String(j.client) === publicKey || String(j.freelancer) === publicKey));
  const xlmEarned = myFreelanceJobs.filter(j => getStatusKey(j.status) === 'Completed').reduce((sum, j) => sum + Number(j.amount) / 10_000_000, 0);
  const xlmSpent = myPostedJobs.filter(j => getStatusKey(j.status) === 'Completed').reduce((sum, j) => sum + Number(j.amount) / 10_000_000, 0);
  const reputationScore = Math.min(100, completedJobs.length * 20 + nftCount * 5);

  const handleCopyKey = () => {
    navigator.clipboard.writeText(publicKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Styles ──────────────────────────────────────────────────────────────────
  const card = {
    background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.9)',
    border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.1)',
    borderRadius: '20px', padding: '24px', marginBottom: '20px',
  };
  const statCard = {
    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
    border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)',
    borderRadius: '16px', padding: '20px', textAlign: 'center',
  };
  const label = { fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.5px', color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)', textTransform: 'uppercase', marginBottom: '6px' };
  const value = { fontSize: '1.6rem', fontWeight: 800, color: isDark ? '#fff' : '#1a1a2e' };

  if (!account) {
    return (
      <div className="profile-page-wrapper">
        <motion.div className="loading-container" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="loading-spinner" />
          <p className="loading-text" style={{ color: isDark ? '#fff' : '#1a1a2e' }}>Loading account details...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="profile-page-wrapper">
      <motion.div className="profile-container" variants={containerVariants} initial="hidden" animate="visible"
        style={{ maxWidth: '800px', margin: '0 auto', padding: '24px 16px' }}>

        {/* ── HEADER with Avatar ─────────────────────────────────────────── */}
        <motion.div variants={itemVariants} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
          {/* Avatar */}
          <div style={{
            width: '72px', height: '72px', borderRadius: '50%',
            background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}88)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.6rem', fontWeight: 800, color: '#fff',
            boxShadow: `0 8px 24px ${avatarColor}44`, flexShrink: 0,
          }}>
            {getInitials(publicKey)}
          </div>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 700, letterSpacing: "-0.03em", color: isDark ? "#fff" : "#1a1a2e" }}>
              My <span style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Profile</span>
            </h1>
            <p style={{ color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)", marginTop: '4px' }}>
              Your on-chain identity and reputation
            </p>
            <div style={{ width: "48px", height: "3px", background: "linear-gradient(135deg, #8b5cf6, #3b82f6)", borderRadius: "2px", margin: '8px auto 0' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
            <code style={{ fontSize: '0.8rem', color: isDark ? '#a78bfa' : '#6d28d9', background: isDark ? 'rgba(167,139,250,0.1)' : 'rgba(109,40,217,0.08)', padding: '4px 10px', borderRadius: '8px' }}>
              {shortenKey(publicKey)}
            </code>
            <button onClick={handleCopyKey} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center' }}>
              {copied ? <CheckIcon className="copy-icon" /> : <CopyIcon className="copy-icon" />}
            </button>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', padding: '3px 10px', borderRadius: '20px' }}>
              ⭐ {reputationScore} Rep
            </span>
          </div>
        </motion.div>

        {/* ── WALLET STATS ───────────────────────────────────────────────── */}
        <motion.div variants={itemVariants} style={card}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: isDark ? '#fff' : '#1a1a2e', marginBottom: '16px' }}>💰 Wallet</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            <div style={statCard}>
              <div style={label}>XLM Balance</div>
              <div style={value}>{parseFloat(xlmBalance).toFixed(0)}</div>
              <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '4px' }}>Available</div>
            </div>
            <div style={statCard}>
              <div style={label}>NFTs Owned</div>
              <div style={value}>{nftCount}</div>
              <div style={{ fontSize: '0.75rem', color: '#a78bfa', marginTop: '4px' }}>Collection</div>
            </div>
            <div style={statCard}>
              <div style={label}>Reward Token</div>
              <div style={value}>{rewardBalance || 0}</div>
              <div style={{ fontSize: '0.75rem', color: '#60a5fa', marginTop: '4px' }}>Token</div>
            </div>
          </div>
        </motion.div>

        {/* ── JOBS STATS ─────────────────────────────────────────────────── */}
        <motion.div variants={itemVariants} style={card}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: isDark ? '#fff' : '#1a1a2e', marginBottom: '16px' }}>💼 Jobs Stats</h2>
          {loadingJobs ? (
            <div style={{ textAlign: 'center', padding: '20px', color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>⏳ Loading...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              <div style={statCard}>
                <div style={label}>Jobs Posted</div>
                <div style={value}>{myPostedJobs.length}</div>
                <div style={{ fontSize: '0.75rem', color: '#60a5fa', marginTop: '4px' }}>As Client</div>
              </div>
              <div style={statCard}>
                <div style={label}>Jobs Accepted</div>
                <div style={value}>{myFreelanceJobs.length}</div>
                <div style={{ fontSize: '0.75rem', color: '#a78bfa', marginTop: '4px' }}>As Freelancer</div>
              </div>
              <div style={statCard}>
                <div style={label}>XLM Earned</div>
                <div style={{ ...value, fontSize: '1.3rem', color: '#10b981' }}>{xlmEarned.toFixed(1)}</div>
                <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '4px' }}>Freelance Income</div>
              </div>
              <div style={statCard}>
                <div style={label}>XLM Spent</div>
                <div style={{ ...value, fontSize: '1.3rem', color: '#f59e0b' }}>{xlmSpent.toFixed(1)}</div>
                <div style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: '4px' }}>Hired Others</div>
              </div>
            </div>
          )}
        </motion.div>

        {/* ── REPUTATION ─────────────────────────────────────────────────── */}
        <motion.div variants={itemVariants} style={card}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: isDark ? '#fff' : '#1a1a2e', marginBottom: '16px' }}>⭐ Reputation Score</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%', flexShrink: 0,
              background: `conic-gradient(#f59e0b ${reputationScore * 3.6}deg, ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'} 0deg)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: isDark ? 'rgba(13,17,28,0.98)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.9rem', color: '#f59e0b' }}>
                {reputationScore}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ height: '8px', borderRadius: '4px', background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)', overflow: 'hidden', marginBottom: '8px' }}>
                <div style={{ height: '100%', width: `${reputationScore}%`, background: 'linear-gradient(90deg, #f59e0b, #d97706)', borderRadius: '4px', transition: 'width 1s ease' }} />
              </div>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.8rem', color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}>✅ {completedJobs.length} jobs completed</span>
                <span style={{ fontSize: '0.8rem', color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}>🖼️ {nftCount} NFTs owned</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── RECENT JOBS ────────────────────────────────────────────────── */}
        {jobs.length > 0 && (
          <motion.div variants={itemVariants} style={card}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: isDark ? '#fff' : '#1a1a2e', marginBottom: '16px' }}>📋 Recent Jobs</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {jobs.filter(j => String(j.client) === publicKey || String(j.freelancer) === publicKey).slice(-5).reverse().map(job => {
                const sk = getStatusKey(job.status);
                const statusColor = { Open: '#60a5fa', InProgress: '#facc15', Submitted: '#fb923c', Completed: '#34d399', Cancelled: '#f87171' }[sk] || '#60a5fa';
                return (
                  <div key={job.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderRadius: '12px', border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: isDark ? '#fff' : '#1a1a2e' }}>{job.title}</div>
                      <div style={{ fontSize: '0.75rem', color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)', marginTop: '2px' }}>Job #{job.id}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: statusColor, background: `${statusColor}20`, padding: '3px 10px', borderRadius: '20px', marginBottom: '4px' }}>{sk}</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#10b981' }}>{(Number(job.amount) / 10_000_000).toFixed(0)} XLM</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ── NFT CERTIFICATES ───────────────────────────────────────────── */}
        {nfts && nfts.length > 0 && (
          <motion.div variants={itemVariants} style={card}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: isDark ? '#fff' : '#1a1a2e', marginBottom: '16px' }}>🏆 NFT Collection</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
              {nfts.slice(0, 6).map((nft, i) => (
                <div key={i} style={{ borderRadius: '12px', overflow: 'hidden', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)', background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
                  <div style={{ height: '100px', background: `linear-gradient(135deg, ${generateAvatar(nft.name || String(i))}44, ${generateAvatar(nft.name || String(i))}22)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
                    🖼️
                  </div>
                  <div style={{ padding: '8px' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: isDark ? '#fff' : '#1a1a2e', truncate: true }}>{nft.name || 'NFT'}</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <motion.div variants={itemVariants} style={{ textAlign: 'center', color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)', fontSize: '0.75rem', marginTop: '8px' }}>
          Connected to Stellar Network • Based on latest account data
        </motion.div>

      </motion.div>
    </div>
  );
};

export default ProfilePage;