import React, { useState } from 'react';
import { motion } from 'framer-motion';
import './ProfileViewer.css';

const StatItem = ({ icon, label, value, isCopyable, onCopy }) => (
  <motion.div 
    className="stat-item"
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.3 }}
  >
    <div className="stat-left">
      <span className="stat-icon">{icon}</span>
      <span className="stat-label">{label}</span>
    </div>
    <div className="stat-right">
      <span className="stat-value">{value}</span>
      {isCopyable && (
        <motion.button
          className="copy-button"
          onClick={onCopy}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          title="Copy to clipboard"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        </motion.button>
      )}
    </div>
  </motion.div>
);

export const ProfileViewer = ({ account, nftCount }) => {
  const [copied, setCopied] = useState(false);

  if (!account) {
    return (
      <motion.div 
        className="profile-container"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="glass-card">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading profile details...</p>
          </div>
        </div>
      </motion.div>
    );
  }

  const xlmBalance = account.balances.find(b => b.asset_type === 'native');
  const truncatedKey = `${account.id.slice(0, 6)}...${account.id.slice(-4)}`;
  const balance = xlmBalance ? parseFloat(xlmBalance.balance).toFixed(2) : '0.00';

  const handleCopyKey = async () => {
    try {
      await navigator.clipboard.writeText(account.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4 }
    }
  };

  return (
    <motion.div 
      className="profile-container"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div 
        className="glass-card"
        variants={itemVariants}
        whileHover={{ 
          y: -5,
          boxShadow: "0 20px 60px rgba(139, 92, 246, 0.3)"
        }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        {/* Profile Header */}
        <motion.div 
          className="profile-header"
          variants={itemVariants}
        >
          <div className="wallet-icon-container">
            <motion.div 
              className="wallet-icon"
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.6 }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8"></path>
                <path d="M12 12v7"></path>
                <path d="M16 12h6"></path>
                <path d="M19 9v6"></path>
              </svg>
            </motion.div>
          </div>
          <h1 className="profile-title">Account Overview</h1>
          <div className="status-badge">
            <span className="status-dot"></span>
            <span>Connected</span>
          </div>
        </motion.div>

        {/* Stats Section */}
        <motion.div 
          className="stats-section"
          variants={itemVariants}
        >
          <StatItem
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8"></path>
                <path d="M12 12v7"></path>
                <path d="M16 12h6"></path>
                <path d="M19 9v6"></path>
              </svg>
            }
            label="Public Key"
            value={truncatedKey}
            isCopyable={true}
            onCopy={handleCopyKey}
          />

          <StatItem
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 6v6l4 2"></path>
              </svg>
            }
            label="XLM Balance"
            value={
              <span className="balance-badge">
                <span className="balance-amount">{balance}</span>
                <span className="balance-symbol">XLM</span>
              </span>
            }
          />

          <StatItem
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
            }
            label="NFTs Owned"
            value={
              <span className="nft-count">
                <span className="nft-number">{nftCount}</span>
                <span className="nft-label">items</span>
              </span>
            }
          />
        </motion.div>

        {/* Copy Notification */}
        {copied && (
          <motion.div 
            className="copy-notification"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Copied to clipboard!
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
};