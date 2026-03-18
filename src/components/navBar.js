import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useWallet } from '../WalletContext';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase';
import './navBar.css';

const Gem = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M6 3h12l4 6-10 13L2 9Z" /><path d="M11 3 8 9l4 13 4-13-3-6" />
  </svg>
);

const LogOut = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" />
  </svg>
);

const NavBar = () => {
  const { walletAddress, disconnectWallet, setModalOpen } = useWallet();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastSeen, setLastSeen] = useState(Date.now());
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Unread messages count
  useEffect(() => {
    if (!walletAddress) return;
    const chatsRef = ref(db, 'chats');
    const unsubscribe = onValue(chatsRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) return;
      let count = 0;
      Object.values(data).forEach((chat) => {
        if (chat.messages) {
          Object.values(chat.messages).forEach((msg) => {
            if (
              msg.senderAddress !== walletAddress &&
              msg.timestamp > lastSeen
            ) {
              count++;
            }
          });
        }
      });
      setUnreadCount(count);
    });
    return () => unsubscribe();
  }, [walletAddress, lastSeen]);

  const handleChatClick = () => {
    setLastSeen(Date.now());
    setUnreadCount(0);
    navigate('/chat');
  };

  const shortenAddress = (addr) => {
    if (!addr || typeof addr !== 'string') return '';
    return `${addr.slice(0, 5)}...${addr.slice(-5)}`;
  };

  const NavLinks = ({ mobile = false }) => (
    <>
      <NavLink to="/" className={({ isActive }) => `${mobile ? 'mobile-link' : 'nav-link'} ${isActive ? 'active' : ''}`} onClick={() => setIsMobileMenuOpen(false)}>Dashboard</NavLink>
      <NavLink to="/escrow" className={({ isActive }) => `${mobile ? 'mobile-link' : 'nav-link'} ${isActive ? 'active' : ''}`} onClick={() => setIsMobileMenuOpen(false)}>Jobs</NavLink>
      <NavLink to="/payment" className={({ isActive }) => `${mobile ? 'mobile-link' : 'nav-link'} ${isActive ? 'active' : ''}`} onClick={() => setIsMobileMenuOpen(false)}>Payment</NavLink>
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
        }
        .wallet-badge:hover {
          background: rgba(45, 45, 60, 0.7);
          border-color: rgba(255, 255, 255, 0.2);
          transform: translateY(-1px);
        }
        .chat-icon-btn {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          background: rgba(99,102,241,0.15);
          border: 1px solid rgba(99,102,241,0.3);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 18px;
          text-decoration: none;
          color: white;
        }
        .chat-icon-btn:hover {
          background: rgba(99,102,241,0.3);
          transform: translateY(-2px);
        }
        .unread-badge {
          position: absolute;
          top: -6px;
          right: -6px;
          background: #ef4444;
          color: white;
          font-size: 0.65rem;
          font-weight: 700;
          min-width: 18px;
          height: 18px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 4px;
          border: 2px solid rgba(13,17,28,0.9);
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
        <Link to="/" className="flex items-center gap-2 text-lg font-semibold text-white hover:opacity-80 transition-opacity">
          <Gem className="w-5 h-5 text-purple-400" />
          FreelanceChain
        </Link>

        <div className="nav-links">
          <NavLinks />
        </div>

        <div className="nav-wallet">
          {walletAddress && typeof walletAddress === 'string' ? (
            <div className="wallet-widget-container">

              {/* Chat Icon with unread badge */}
              <button
                className="chat-icon-btn"
                onClick={handleChatClick}
                title="Chat"
              >
                💬
                {unreadCount > 0 && (
                  <span className="unread-badge">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Wallet Address */}
              <span
                className="bg-green-500/10 text-green-400 px-3 py-1 rounded-full text-xs font-medium cursor-pointer hover:bg-green-500/20 transition-colors border border-green-500/20"
                onClick={() => setModalOpen(true)}
              >
                {shortenAddress(walletAddress)}
              </span>

              {/* Logout */}
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
            <button onClick={() => setModalOpen(true)} className="connect-btn">
              Connect Wallet
            </button>
          )}

          <button className="mobile-toggle" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>

        <div className={`mobile-menu ${isMobileMenuOpen ? 'open' : ''}`}>
          <NavLinks mobile />
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