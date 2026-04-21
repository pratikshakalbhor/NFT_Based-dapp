/**
 * User Feedback: Improve UI design slightly
 * - Added mobile device detection
 * - Show "Detected" badge for installed wallets
 * - Show "Install" button with store links for missing wallets
 * - Better visual hierarchy with gradient wallet icons
 */
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { X, LogOut, Wallet, ExternalLink, Smartphone } from 'lucide-react';
import { useWallet } from './WalletContext';
import { shortenAddress } from './utils';
import { WALLET_TYPES, checkConnection } from './walletService';
import './WalletModal.css';

// ── Detect mobile device ──────────────────────────────────────────────────────
const isMobile = () => /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);

// ── Detect installed wallets on mobile ───────────────────────────────────────
const detectMobileWallets = () => ({
  freighter: !!(window.freighter || window.freighterApi),
  xbull: !!(window.xBull || window.xbull),
  lobstr: !!(window.lobstr),
});

// ── Install links ─────────────────────────────────────────────────────────────
const INSTALL_LINKS = {
  freighter: {
    desktop: "https://www.freighter.app/",
    ios: "https://www.freighter.app/",
    android: "https://www.freighter.app/",
  },
  xbull: {
    desktop: "https://chromewebstore.google.com/detail/xbull-wallet/omajpeaffjgmlpmhbfdjepdejoemifpe",
    ios: "https://chromewebstore.google.com/detail/xbull-wallet/omajpeaffjgmlpmhbfdjepdejoemifpe",
    android: "https://chromewebstore.google.com/detail/xbull-wallet/omajpeaffjgmlpmhbfdjepdejoemifpe",
  },
  lobstr: {
    desktop: "https://lobstr.co/",
    ios: "https://apps.apple.com/app/lobstr-stellar-wallet/id1404357892",
    android: "https://play.google.com/store/apps/details?id=com.lobstr.client",
  },
};

const getInstallLink = (wallet) => {
  const mobile = isMobile();
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (!mobile) return INSTALL_LINKS[wallet]?.desktop;
  return isIOS ? INSTALL_LINKS[wallet]?.ios : INSTALL_LINKS[wallet]?.android;
};

const WalletModal = () => {
  const {
    isModalOpen, setModalOpen, connectWallet,
    connectedWallets, walletAddress, walletType,
    switchWallet, disconnectWallet
  } = useWallet();

  const [available, setAvailable] = useState({ freighter: false, xbull: false });
  const [mobileWallets, setMobileWallets] = useState({ freighter: false, xbull: false, lobstr: false });
  const [connecting, setConnecting] = useState(null);
  const [error, setError] = useState('');
  const mobile = isMobile();
  const navigate = useNavigate();

  useEffect(() => {
    if (isModalOpen) {
      checkConnection()
        .then(setAvailable)
        .catch(e => console.warn("Wallet check failed:", e));

      // Detect mobile wallets
      if (mobile) {
        setMobileWallets(detectMobileWallets());
      }
      setError('');
    }
  }, [isModalOpen, mobile]);

  const handleConnect = async (type) => {
    setConnecting(type);
    setError('');
    try {
      await connectWallet(type);
    } catch (error) {
      if (error?.message?.includes("User declined") || error?.message?.includes("User rejected")) {
        setError("Connection cancelled.");
      } else {
        setError(error.message || 'Connection failed');
      }
    } finally {
      setConnecting(null);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !connecting) {
      setModalOpen(false);
    }
  };

  // ── Wallet button component ───────────────────────────────────────────────
  const WalletButton = ({ type, label, description, icon, isAvailable, installKey }) => {
    const isInstalled = mobile ? mobileWallets[installKey] : isAvailable;
    const isConnecting = connecting === type;
    const installLink = getInstallLink(installKey);

    return (
      <div style={{ marginBottom: "10px" }}>
        <button
          className="wallet-option-btn"
          onClick={() => isInstalled ? handleConnect(type) : window.open(installLink, '_blank')}
          disabled={!!connecting}
          style={{
            width: "100%",
            opacity: connecting && !isConnecting ? 0.6 : 1,
            position: "relative",
          }}
        >
          <div className="wallet-option-content">
            <div className="wallet-icon">{icon}</div>
            <div className="wallet-details">
              <div className="wallet-name">{label}</div>
              <div className="wallet-description">
                {isConnecting ? "Connecting..." :
                  isInstalled ? description :
                  mobile ? "Tap to install on mobile" : "Click to install extension"}
              </div>
            </div>
          </div>

          {/* Status indicator */}
          {isInstalled && walletType === type ? (
            <div className="connected-check">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          ) : isInstalled ? (
            <span style={{
              fontSize: "0.7rem", padding: "2px 8px",
              background: "rgba(16,185,129,0.15)",
              border: "1px solid rgba(16,185,129,0.3)",
              borderRadius: "6px", color: "#10b981", fontWeight: 600,
            }}>Detected</span>
          ) : (
            <span style={{
              fontSize: "0.7rem", padding: "2px 8px",
              background: "rgba(99,102,241,0.15)",
              border: "1px solid rgba(99,102,241,0.3)",
              borderRadius: "6px", color: "#a78bfa", fontWeight: 600,
              display: "flex", alignItems: "center", gap: "4px",
            }}>
              {mobile ? <Smartphone size={10} /> : <ExternalLink size={10} />}
              Install
            </span>
          )}
        </button>

        {/* Albedo popup warning */}
        {type === WALLET_TYPES.ALBEDO && (
          <div style={{
            marginTop: "6px", padding: "8px 12px",
            background: "rgba(251,191,36,0.08)",
            border: "1px solid rgba(251,191,36,0.2)",
            borderRadius: "8px", fontSize: "0.75rem", color: "#fbbf24",
          }}>
            {mobile
              ? "Albedo opens in browser — allow popups if prompted"
              : "If popup doesn't appear: Chrome → Settings → Privacy → Popups → Allow this site"}
          </div>
        )}
      </div>
    );
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
              <h2 className="wallet-modal-title">
                {mobile ? (
                  <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Smartphone size={20} /> Connect Wallet
                  </span>
                ) : "Connect Wallet"}
              </h2>
              <button className="wallet-modal-close" onClick={() => setModalOpen(false)}>
                <X size={24} />
              </button>
            </div>

            {/* Mobile notice */}
            {mobile && (
              <div style={{
                padding: "10px 14px", marginBottom: "12px",
                background: "rgba(99,102,241,0.08)",
                border: "1px solid rgba(99,102,241,0.2)",
                borderRadius: "10px", fontSize: "0.8rem",
                color: "#a78bfa",
              }}>
                Mobile detected — installed wallets are highlighted. Tap "Install" to get a wallet app.
              </div>
            )}

            {error && (
              <div className="wallet-not-found">
                <X size={20} />
                <p>{error}</p>
              </div>
            )}

            {/* Connected wallets */}
            {connectedWallets.length > 0 && (
              <div className="wallet-options">
                <h3 className="wallet-modal-subtitle">Connected Wallets</h3>
                {connectedWallets.map((wallet) => (
                  <div
                    key={wallet.address}
                    className="wallet-option-btn"
                    style={{ borderColor: wallet.address === walletAddress ? 'var(--success)' : '', marginBottom: "8px" }}
                    onClick={() => switchWallet(wallet.address)}
                  >
                    <div className="wallet-option-content">
                      <div className="wallet-icon"><Wallet size={20} /></div>
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
                <div className="wallet-modal-divider" />
              </div>
            )}

            {/* Wallet options */}
            <div className="wallet-options">
              <h3 className="wallet-modal-subtitle">
                {connectedWallets.length > 0 ? 'Connect Another Wallet' : 'Select Wallet'}
              </h3>

              <WalletButton
                type={WALLET_TYPES.FREIGHTER}
                label="Freighter"
                description="Stellar Extension Wallet"
                icon="F"
                isAvailable={available.freighter}
                installKey="freighter"
              />
              <div className="wallet-modal-divider" style={{ margin: "8px 0" }} />

              <WalletButton
                type={WALLET_TYPES.ALBEDO}
                label="Albedo"
                description="Web Wallet — no install needed"
                icon="A"
                isAvailable={true}
                installKey="freighter"
              />
              <div className="wallet-modal-divider" style={{ margin: "8px 0" }} />

              <WalletButton
                type={WALLET_TYPES.XBULL}
                label="xBull"
                description="Stellar Wallet"
                icon="X"
                isAvailable={available.xbull}
                installKey="xbull"
              />
            </div>

            <div className="wallet-modal-footer">
              <button
                className="wallet-option-btn"
                onClick={() => setModalOpen(false)}
                style={{
                  justifyContent: 'center',
                  border: '1px solid rgba(255,100,100,0.3)',
                  color: '#ff6b6b',
                  marginTop: '12px'
                }}
              >
                Cancel
              </button>
              <p className="security-note">
                Your keys are stored securely in your wallet app.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WalletModal;