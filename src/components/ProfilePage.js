import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { containerVariants, itemVariants } from './ProfilePageAnimations';
import {
  AccountIcon,
  LockIcon,
  XLMIcon,
  NFTGridIcon,
  CheckIcon,
  CopyIcon,
} from './ProfilePageIcons';
import './ProfilePage.css';

const ProfilePage = ({ account, nfts, rewardBalance }) => {
  const { isDark } = useTheme();
  const [copied, setCopied] = useState(false);

  if (!account) {
    return (
      <div className="profile-page-wrapper">
        <motion.div
          className="loading-container"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="loading-spinner" />
          <p className="loading-text" style={{ color: isDark ? "#fff" : "#1a1a2e" }}>Loading account details...</p>
        </motion.div>
      </div>
    );
  }

  const xlmBalance = account.balances.find((b) => b.asset_type === "native")?.balance || "0";
  const nftCount = nfts ? nfts.length : 0;
  const publicKey = account.id;
  const truncatedKey = `${publicKey.slice(0, 6)}...${publicKey.slice(-6)}`;

  const handleCopyKey = () => {
    navigator.clipboard.writeText(publicKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="profile-page-wrapper">
      <motion.div
        className="profile-container"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Profile Header */}
        <motion.div className="profile-header" variants={itemVariants}>
          <div className="header-icon-wrapper">
            <AccountIcon className="header-icon" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight" style={{ color: isDark ? "#fff" : "#1a1a2e" }}>Account Overview</h1>
            <p className="text-sm mt-1" style={{ color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)" }}>Web3 Wallet Details</p>
          </div>
        </motion.div>

        {/* Main Card */}
        <motion.div className="card profile-details-card" variants={itemVariants} style={{
          background: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.9)",
          border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.1)"
        }}>
          {/* Public Key Section */}
          <div className="card-section">
            <div className="section-header">
              <LockIcon className="section-icon" />
              <span className="section-label" style={{ color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)" }}>Public Key</span>
            </div>
            <div className="public-key-container">
              <code className="public-key-value" title={publicKey}>
                {truncatedKey}
              </code>
              <button
                className={`copy-button ${copied ? 'copied' : ''}`}
                onClick={handleCopyKey}
                title="Copy full public key"
              >
                {copied ? <CheckIcon className="copy-icon" /> : <CopyIcon className="copy-icon" />}
              </button>
            </div>
            <p className="key-hint" style={{ color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.5)" }}>Click to copy • Fully: {publicKey}</p>
          </div>

          {/* Stats Grid */}
          <div className="stats-grid">
            {/* XLM Balance */}
            <motion.div className="stat-card" variants={itemVariants}>
              <div className="stat-icon xlm-icon">
                <XLMIcon />
              </div>
              <div className="stat-content">
                <span className="stat-label" style={{ color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.7)" }}>XLM Balance</span>
                <span className="stat-value" style={{ color: isDark ? "#fff" : "#1a1a2e" }}>{parseFloat(xlmBalance).toFixed(2)}</span>
              </div>
              <div className="stat-badge">Available</div>
            </motion.div>

            {/* NFTs Owned */}
            <motion.div className="stat-card" variants={itemVariants}>
              <div className="stat-icon nft-icon">
                <NFTGridIcon />
              </div>
              <div className="stat-content">
                <span className="stat-label" style={{ color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.7)" }}>NFTs Owned</span>
                <span className="stat-value" style={{ color: isDark ? "#fff" : "#1a1a2e" }}>{nftCount}</span>
              </div>
              <div className="stat-badge">Collection</div>
            </motion.div>

            {/* Reward Balance */}
            <motion.div className="stat-card" variants={itemVariants}>
              <div className="stat-icon xlm-icon">
                <XLMIcon />
              </div>
              <div className="stat-content">
                <span className="stat-label" style={{ color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.7)" }}>Reward Token</span>
                <span className="stat-value" style={{ color: isDark ? "#fff" : "#1a1a2e" }}>{rewardBalance}</span>
              </div>
              <div className="stat-badge">Token</div>
            </motion.div>

          </div>

          {/* Divider */}
          <div className="card-divider" />

          {/* Footer Info */}
          <div className="card-footer">
            <p className="footer-text" style={{ color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)" }}>
              Connected to Stellar Network • Based on latest account data
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default ProfilePage;