import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { X, LogOut, Wallet, ExternalLink } from 'lucide-react';
import { useWallet } from './WalletContext';
import { shortenAddress } from './utils';
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
  const navigate = useNavigate();

  useEffect(() => {
    if (isModalOpen) {
      checkConnection()
        .then(setAvailable)
        .catch((e) => console.warn("Wallet check failed:", e));
      setError('');
    }
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

  return (
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
            <div className="wallet-modal-header">
              <h2 className="wallet-modal-title">Connect Wallet</h2>
              <button className="wallet-modal-close" onClick={() => setModalOpen(false)}>
                <X size={24} />
              </button>
            </div>

            {error && (
              <div className="wallet-not-found">
                <X size={20} />
                <div>
                  <p>{error}</p>
                  {error.includes("Freighter") && (
                    <a href="https://freighter.app/" target="_blank" rel="noopener noreferrer">
                      Install Freighter Extension <ExternalLink size={12} style={{ display: 'inline' }} />
                    </a>
                  )}
                </div>
              </div>
            )}

            {connectedWallets.length > 0 && (
              <div className="wallet-options">
                <h3 className="wallet-modal-subtitle">Connected Wallets</h3>
                <div className="wallet-options">
                  {connectedWallets.map((wallet) => (
                    <div 
                      key={wallet.address} 
                      className="wallet-option-btn"
                      style={{ borderColor: wallet.address === walletAddress ? 'var(--success)' : '' }}
                      onClick={() => switchWallet(wallet.address)}
                    >
                      <div className="wallet-option-content">
                        <div className="wallet-icon">
                          <Wallet size={24} />
                        </div>
                        <div className="wallet-details">
                          <span className="wallet-name">{wallet.name || wallet.type}</span>
                          <span className="wallet-description">{shortenAddress(wallet.address)}</span>
                        </div>
                      </div>
                      <button 
                        className="wallet-modal-close"
                        style={{ width: 32, height: 32, marginLeft: 8 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          disconnectWallet(wallet.address);
                          navigate('/login');
                        }}
                      >
                        <LogOut size={16} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="wallet-modal-divider" />
              </div>
            )}

            <div className="wallet-options">
              <h3 className="wallet-modal-subtitle">{connectedWallets.length > 0 ? 'Connect Another Wallet' : 'Select Wallet'}</h3>
              
              <button 
                className="wallet-option-btn" 
                onClick={() => handleConnect(WALLET_TYPES.FREIGHTER)} 
                disabled={connecting}
              >
                <div className="wallet-option-content">
                  <div className="wallet-icon">F</div>
                  <div className="wallet-details">
                    <div className="wallet-name">Freighter</div>
                    <div className="wallet-description">Stellar Extension</div>
                  </div>
                </div>
                {available.freighter && (
                  <div className="connected-check">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                )}
              </button>

              <button className="wallet-option-btn" onClick={() => handleConnect(WALLET_TYPES.ALBEDO)} disabled={connecting}>
                <div className="wallet-option-content">
                  <div className="wallet-icon">A</div>
                  <div className="wallet-details">
                    <div className="wallet-name">Albedo</div>
                    <div className="wallet-description">Web Wallet</div>
                  </div>
                </div>
              </button>

              <button className="wallet-option-btn" onClick={() => handleConnect(WALLET_TYPES.XBULL)} disabled={connecting}>
                <div className="wallet-option-content">
                  <div className="wallet-icon">X</div>
                  <div className="wallet-details">
                    <div className="wallet-name">xBull</div>
                    <div className="wallet-description">Stellar Wallet</div>
                  </div>
                </div>
                {available.xbull && (
                  <div className="connected-check">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                )}
                </button>
            </div>

            <div className="wallet-modal-footer">
              <p className="security-note">
                Your keys are stored securely in your wallet extension.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WalletModal;