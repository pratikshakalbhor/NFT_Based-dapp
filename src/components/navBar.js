import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useWallet } from '../WalletContext';
import './navBar.css';

// Inline Lucide Icons for immediate usage
const Gem = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M6 3h12l4 6-10 13L2 9Z"/><path d="M11 3 8 9l4 13 4-13-3-6"/>
  </svg>
);

const LogOut = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>
  </svg>
);

const NavBar = () => {
  const { walletAddress, disconnectWallet, setModalOpen } = useWallet();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

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
      <NavLink to="/marketplace" className={({ isActive }) => `${mobile ? 'mobile-link' : 'nav-link'} ${isActive ? 'active' : ''}`} onClick={() => setIsMobileMenuOpen(false)}>Marketplace</NavLink>
      <NavLink to="/activity" className={({ isActive }) => `${mobile ? 'mobile-link' : 'nav-link'} ${isActive ? 'active' : ''}`} onClick={() => setIsMobileMenuOpen(false)}>Activity</NavLink>
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
      <Link to="/" className="flex items-center gap-2 text-lg font-semibold text-white hover:opacity-80 transition-opacity">
        <Gem className="w-5 h-5 text-purple-400" />
        NFT dApp
      </Link>

      {/* Desktop Navigation */}
      <div className="nav-links">
        <NavLinks />
      </div>

      {/* Wallet Section */}
      <div className="nav-wallet">
        {walletAddress ? (
          <div className="wallet-widget-container">
            <span 
              className="bg-green-500/10 text-green-400 px-3 py-1 rounded-full text-xs font-medium cursor-pointer hover:bg-green-500/20 transition-colors border border-green-500/20"
              onClick={() => setModalOpen(true)}
            >
              {shortenAddress(walletAddress)}
            </span>
            <button 
              className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500 hover:text-white transition-all duration-300 text-sm font-medium"
              onClick={() => {
                disconnectWallet();
                navigate('/login');
              }} 
            >
              <LogOut className="w-4 h-4" />
              Logout
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