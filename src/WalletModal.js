import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from './WalletContext';
import { WALLET_TYPES, checkConnection } from './walletService';
import './WalletModal.css';

const WalletModal = () => {
  const { 
    isModalOpen, 
    setModalOpen, 
    connectWallet, 
    connectedWallets, 
    walletAddress, 
    switchWallet, 
    disconnectWallet 
  } = useWallet();
  
  const [available, setAvailable] = useState({ freighter: false, xbull: false });
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    checkConnection().then(setAvailable);
  }, []);

  useEffect(() => {
    if (isModalOpen) setError('');
  }, [isModalOpen]);

  const handleConnect = async (type) => {
    setConnecting(true);
    setError('');
    try {
      await connectWallet(type);
    } catch (error) {
      console.error('Connection failed:', error);
      setError(error.message || 'Connection failed');
    } finally {
      setConnecting(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !connecting) {
      setModalOpen(false);
    }
  };

  const shortenAddress = (addr) => `${addr.slice(0, 6)}...${addr.slice(-6)}`;

  return (
    <>
    <style>{`
      .wallet-modal-container {
        width: 100%;
        max-width: 450px;
        background: #1a1b23;
        color: white;
        border-radius: 16px;
        padding: 24px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.5);
      }
      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
      }
      .modal-header h2 {
        margin: 0;
        font-size: 1.25rem;
      }
      .close-btn {
        background: none;
        border: none;
        color: #888;
        cursor: pointer;
        font-size: 1.2rem;
        padding: 4px;
      }
      .close-btn:hover { color: white; }
      
      .connected-wallets-section {
        margin-bottom: 24px;
      }
      .connected-wallets-section h3, .connect-new-section h3 {
        font-size: 0.9rem;
        color: #888;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 12px;
      }
      
      .wallets-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .wallet-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px;
        background: #252630;
        border-radius: 12px;
        cursor: pointer;
        border: 1px solid transparent;
        transition: all 0.2s;
      }
      .wallet-item:hover {
        background: #2d2e3a;
      }
      .wallet-item.active {
        border-color: #3b82f6;
        background: rgba(59, 130, 246, 0.1);
      }
      
      .wallet-info-left {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .status-indicator {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #666;
      }
      .status-indicator.online {
        background: #10b981;
        box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
      }
      
      .wallet-details {
        display: flex;
        flex-direction: column;
      }
      .wallet-name {
        font-weight: 600;
        font-size: 0.95rem;
      }
      .wallet-addr {
        font-size: 0.8rem;
        color: #888;
        font-family: monospace;
      }
      
      .wallet-actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .active-badge {
        font-size: 0.7rem;
        background: #3b82f6;
        color: white;
        padding: 2px 6px;
        border-radius: 4px;
      }
      .disconnect-icon-btn {
        background: none;
        border: none;
        color: #666;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
      }
      .disconnect-icon-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #ef4444;
      }
      
      .wallet-options-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
      }
      .wallet-option-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 16px;
        background: #252630;
        border: 1px solid #333;
        border-radius: 12px;
        color: white;
        cursor: pointer;
        transition: all 0.2s;
      }
      .wallet-option-btn:hover:not(:disabled) {
        background: #2d2e3a;
        border-color: #555;
        transform: translateY(-2px);
      }
      .wallet-option-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .wallet-icon {
        font-size: 1.5rem;
        font-weight: bold;
      }
      
      .error-message {
        background: rgba(239, 68, 68, 0.1);
        color: #ef4444;
        padding: 10px;
        border-radius: 8px;
        margin-bottom: 16px;
        font-size: 0.9rem;
        text-align: center;
      }
    `}</style>
    <AnimatePresence>
      {isModalOpen && (
        <motion.div
          className="wallet-modal-overlay"
          onClick={handleBackdropClick}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="wallet-modal-container"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div className="modal-header">
              <h2>Wallet Management</h2>
              <button className="close-btn" onClick={() => setModalOpen(false)}>✕</button>
            </div>

            {error && <div className="error-message">{error}</div>}

            {connectedWallets.length > 0 && (
              <div className="connected-wallets-section">
                <h3>Connected Wallets</h3>
                <div className="wallets-list">
                  {connectedWallets.map((wallet) => (
                    <div 
                      key={wallet.address} 
                      className={`wallet-item ${wallet.address === walletAddress ? 'active' : ''}`}
                      onClick={() => switchWallet(wallet.address)}
                    >
                      <div className="wallet-info-left">
                        <div className={`status-indicator ${wallet.address === walletAddress ? 'online' : ''}`} />
                        <div className="wallet-details">
                          <span className="wallet-name">{wallet.name || wallet.type}</span>
                          <span className="wallet-addr">{shortenAddress(wallet.address)}</span>
                        </div>
                      </div>
                      <div className="wallet-actions">
                        {wallet.address === walletAddress && <span className="active-badge">Active</span>}
                        <button 
                          className="disconnect-icon-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            disconnectWallet(wallet.address);
                          }}
                          title="Disconnect"
                        >✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="connect-new-section">
              <h3>{connectedWallets.length > 0 ? 'Connect Another Wallet' : 'Connect Wallet'}</h3>
              <div className="wallet-options-grid">
                <button className="wallet-option-btn" onClick={() => handleConnect(WALLET_TYPES.FREIGHTER)} disabled={!available.freighter || connecting}>
                  <span className="wallet-icon">F</span><span>Freighter</span>
                </button>
                <button className="wallet-option-btn" onClick={() => handleConnect(WALLET_TYPES.ALBEDO)} disabled={connecting}>
                  <span className="wallet-icon">A</span><span>Albedo</span>
                </button>
                <button className="wallet-option-btn" onClick={() => handleConnect(WALLET_TYPES.XBULL)} disabled={!available.xbull || connecting}>
                  <span className="wallet-icon">X</span><span>xBull</span>
                </button>
              </div>
            </div>

            <p className="wallet-note">
              Your keys are stored securely in your wallet extension.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
};

export default WalletModal;