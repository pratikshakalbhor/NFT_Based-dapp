import React, { useState } from 'react';
import { motion } from 'framer-motion';
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

const ProfilePage = ({ account, nfts }) => {
  const [copied, setCopied] = useState(false);

  if (!account) {
    return (
      <div className="profile-page-wrapper">
        <div className="profile-bg-gradient" />
        <motion.div
          className="loading-container"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="loading-spinner" />
          <p className="loading-text">Loading account details...</p>
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
      <div className="profile-bg-gradient" />
      
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
            <h1 className="profile-title">Account Overview</h1>
            <p className="profile-subtitle">Web3 Wallet Details</p>
          </div>
        </motion.div>

        {/* Main Card */}
        <motion.div className="card profile-details-card" variants={itemVariants}>
          {/* Public Key Section */}
          <div className="card-section">
            <div className="section-header">
              <LockIcon className="section-icon" />
              <span className="section-label">Public Key</span>
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
            <p className="key-hint">Click to copy • Fully: {publicKey}</p>
          </div>

          {/* Stats Grid */}
          <div className="stats-grid">
            {/* XLM Balance */}
            <motion.div className="stat-card" variants={itemVariants}>
              <div className="stat-icon xlm-icon">
                <XLMIcon />
              </div>
              <div className="stat-content">
                <span className="stat-label">XLM Balance</span>
                <span className="stat-value">{parseFloat(xlmBalance).toFixed(2)}</span>
              </div>
              <div className="stat-badge">Available</div>
            </motion.div>

            {/* NFTs Owned */}
            <motion.div className="stat-card" variants={itemVariants}>
              <div className="stat-icon nft-icon">
                <NFTGridIcon />
              </div>
              <div className="stat-content">
                <span className="stat-label">NFTs Owned</span>
                <span className="stat-value">{nftCount}</span>
              </div>
              <div className="stat-badge">Collection</div>
            </motion.div>
          </div>

          {/* Divider */}
          <div className="card-divider" />

          {/* Footer Info */}
          <div className="card-footer">
            <p className="footer-text">
              Connected to Stellar Network • Based on latest account data
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default ProfilePage;