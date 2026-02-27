import React, { useState, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useWallet } from '../WalletContext';
import './navBar.css';

const NavBar = () => {
  const { walletAddress, walletType, disconnectWallet, setModalOpen } = useWallet();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const shortenAddress = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 5)}...${addr.slice(-5)}`;
  };

  const NavLinks = ({ mobile = false }) => (
    <>
      <NavLink to="/" className={({ isActive }) => `${mobile ? 'mobile-link' : 'nav-link'} ${isActive ? 'active' : ''}`} onClick={() => setIsMobileMenuOpen(false)}>Payment</NavLink>
      <NavLink to="/mint" className={({ isActive }) => `${mobile ? 'mobile-link' : 'nav-link'} ${isActive ? 'active' : ''}`} onClick={() => setIsMobileMenuOpen(false)}>Mint NFT</NavLink>
      <NavLink to="/gallery" className={({ isActive }) => `${mobile ? 'mobile-link' : 'nav-link'} ${isActive ? 'active' : ''}`} onClick={() => setIsMobileMenuOpen(false)}>Gallery</NavLink>
      <NavLink to="/profile" className={({ isActive }) => `${mobile ? 'mobile-link' : 'nav-link'} ${isActive ? 'active' : ''}`} onClick={() => setIsMobileMenuOpen(false)}>Profile</NavLink>
    </>
  );

  return (
    <>
    <style>{`
      .wallet-widget-container {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .wallet-badge {
        display: flex;
        align-items: center;
        gap: 10px;
        background: rgba(30, 30, 40, 0.6);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 6px 12px 6px 10px;
        cursor: pointer;
        transition: all 0.2s ease-in-out;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
      }

      .wallet-badge:hover {
        background: rgba(45, 45, 60, 0.7);
        border-color: rgba(255, 255, 255, 0.2);
        transform: translateY(-1px);
      }

      .wallet-badge-dot {
        width: 9px;
        height: 9px;
        border-radius: 50%;
        background-color: #10b981; /* Green */
        box-shadow: 0 0 8px 1px rgba(16, 185, 129, 0.75);
      }

      .wallet-badge-info {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        line-height: 1.3;
      }

      .wallet-badge-name {
        font-size: 0.8rem;
        font-weight: 500;
        color: #a0aec0; /* gray-400 */
        text-transform: capitalize;
      }

      .wallet-badge-address {
        font-size: 0.9rem;
        font-weight: 600;
        color: #e2e8f0; /* gray-200 */
        font-family: monospace;
      }

      .wallet-badge-network {
        background-color: rgba(56, 161, 105, 0.2);
        color: #38a169;
        font-size: 0.7rem;
        font-weight: 700;
        padding: 2px 6px;
        border-radius: 6px;
        margin-left: 4px;
        border: 1px solid rgba(56, 161, 105, 0.4);
      }

      .logout-button {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 38px;
        height: 38px;
        background: rgba(30, 30, 40, 0.6);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        color: #a0aec0;
        cursor: pointer;
        transition: all 0.2s ease-in-out;
      }

      .logout-button:hover {
        background: rgba(239, 68, 68, 0.15);
        border-color: rgba(239, 68, 68, 0.4);
        color: #ef4444;
      }
    `}</style>
    <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
      {/* Logo */}
      <Link to="/" className="nav-logo">
        Stellar dApp
      </Link>

      {/* Desktop Navigation */}
      <div className="nav-links">
        <NavLinks />
      </div>

      {/* Wallet Section */}
      <div className="nav-wallet">
        {walletAddress ? (
          <div className="wallet-widget-container">
            <div 
              className="wallet-badge" 
              onClick={() => setModalOpen(true)} 
              title="Manage Wallets"
            >
              <span className="wallet-badge-dot"></span>
              <div className="wallet-badge-info">
                <span className="wallet-badge-name">{walletType}</span>
                <span className="wallet-badge-address">{shortenAddress(walletAddress)}</span>
              </div>
              <span className="wallet-badge-network">TESTNET</span>
            </div>
            <button 
              className="logout-button" 
              onClick={() => disconnectWallet()} 
              title="Logout"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                <path d="M7.5 1v7a.5.5 0 0 0 1 0V1a.5.5 0 0 0-1 0z"/>
                <path d="M3 8.812a4.999 4.999 0 0 1 2.578-4.375l-.485-.874A6 6 0 1 0 11.91 3.94l-.485.874A4.999 4.999 0 0 1 3 8.812z"/>
              </svg>
            </button>
          </div>
        ) : (
          <button 
            onClick={() => setModalOpen(true)}
            className="connect-btn"
          >
            Connect Wallet
          </button>
        )}

        {/* Mobile Toggle */}
        <button className="mobile-toggle" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <div className={`mobile-menu ${isMobileMenuOpen ? 'open' : ''}`}>
        <NavLinks mobile />
        {/* Show wallet button in mobile menu if not connected, or just info if connected */}
        {!walletAddress && (
          <button onClick={() => { setModalOpen(true); setIsMobileMenuOpen(false); }} className="connect-btn">
            Connect Wallet
          </button>
        )}
      </div>
    </nav>
    </>
  );
};

export default NavBar;