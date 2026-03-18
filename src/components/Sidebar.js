import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import {
  LayoutDashboard,
  CreditCard,
  ImagePlus,
  Images,
  Store,
  Briefcase,
  Activity,
  User,
  Settings,
  Sun,
  Moon,
  LogOut,
  Wallet
} from "lucide-react";

const SettingsModal = ({ isDark, toggleTheme, onClose }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 10 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        style={{
          background: isDark ? 'rgba(30, 30, 40, 0.98)' : '#ffffff',
          borderRadius: '16px',
          padding: '24px',
          width: '90%',
          maxWidth: '400px',
          border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          color: isDark ? '#ffffff' : '#1a1a2e'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Settings</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: isDark ? '#fff' : '#000', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)', borderRadius: '12px' }}>
            <span style={{ fontWeight: 600 }}>Theme</span>
            <button
              onClick={toggleTheme}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 16px', borderRadius: '8px',
                background: isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.1)',
                border: isDark ? '1px solid rgba(99,102,241,0.3)' : '1px solid rgba(99,102,241,0.5)',
                color: isDark ? '#c7d2fe' : '#4f46e5',
                cursor: 'pointer', fontWeight: 600
              }}
            >
              {isDark ? <Moon size={16} /> : <Sun size={16} />}
              {isDark ? 'Dark' : 'Light'}
            </button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)', borderRadius: '12px' }}>
            <span style={{ fontWeight: 600 }}>Network</span>
            <span style={{ color: isDark ? '#a78bfa' : '#7c3aed', background: isDark ? 'rgba(124,58,237,0.15)' : 'rgba(124,58,237,0.1)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 700 }}>Testnet</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)', borderRadius: '12px' }}>
            <span style={{ fontWeight: 600 }}>Version</span>
            <span style={{ opacity: 0.7, fontSize: '0.9rem' }}>1.0.0</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const Sidebar = ({ walletAddress, onDisconnect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { isDark, toggleTheme } = useTheme();

  const shortenAddress = (addr) => {
    if (!addr || typeof addr !== 'string') return '';
    return `${addr.slice(0, 5)}...${addr.slice(-5)}`;
  };

  // ── Navigation links — Chat removed ──
  const links = [
    { to: "/", icon: <LayoutDashboard size={18} />, label: "Dashboard" },
    { to: "/escrow", icon: <Briefcase size={18} />, label: "Jobs", badge: "NEW" },
    { to: "/payment", icon: <CreditCard size={18} />, label: "Payment" },
    { to: "/mint", icon: <ImagePlus size={18} />, label: "Mint NFT" },
    { to: "/gallery", icon: <Images size={18} />, label: "Gallery" },
    { to: "/marketplace", icon: <Store size={18} />, label: "Marketplace" },
    { to: "/activity", icon: <Activity size={18} />, label: "Activity" },
    { to: "/profile", icon: <User size={18} />, label: "Profile" },
  ];

  const handleLogout = () => {
    if (onDisconnect) onDisconnect();
    window.location.href = '/login';
  };

  const themeStyles = {
    sidebarBg: isDark ? "rgba(13, 17, 28, 0.98)" : "rgba(255,255,255,0.98)",
    activeLinkBg: isDark ? "rgba(99, 102, 241, 0.2)" : "rgba(99,102,241,0.1)",
    inactiveLinkColor: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
    activeLinkColor: isDark ? "#fff" : "#1a1a2e",
    logoText: isDark ? "#fff" : "#1a1a2e",
    walletBadgeBg: isDark ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.1)",
    borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)",
  };

  const navItemStyle = (isActive) => ({
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 20px",
    margin: "4px 12px",
    borderRadius: "8px",
    textDecoration: "none",
    fontWeight: 600,
    fontSize: "0.95rem",
    transition: "all 0.2s ease",
    background: isActive ? themeStyles.activeLinkBg : "transparent",
    borderLeft: isActive ? "3px solid #6366f1" : "3px solid transparent",
    color: isActive ? themeStyles.activeLinkColor : themeStyles.inactiveLinkColor,
  });

  const sidebarContent = (
    <div style={{
      width: "240px",
      height: "100vh",
      position: "fixed",
      top: 0, left: 0,
      background: themeStyles.sidebarBg,
      borderRight: `1px solid ${themeStyles.borderColor}`,
      display: "flex",
      flexDirection: "column",
      zIndex: 50,
      backdropFilter: "blur(12px)",
      boxShadow: isDark ? 'none' : '2px 0 10px rgba(0,0,0,0.05)'
    }}>
      {/* Logo */}
      <div style={{
        padding: "20px 24px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        marginBottom: "8px",
        borderBottom: `1px solid ${themeStyles.borderColor}`,
      }}>
        <div style={{
          width: "36px", height: "36px",
          background: "linear-gradient(135deg, #6366f1, #4f46e5)",
          borderRadius: "10px",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "18px", flexShrink: 0,
        }}>💎</div>
        <span style={{
          color: themeStyles.logoText,
          fontSize: "1rem",
          fontWeight: 800,
          letterSpacing: "-0.5px",
        }}>FreelanceChain</span>
      </div>

      {/* Nav Links */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === "/"}
            onClick={() => setIsOpen(false)}
            style={({ isActive }) => navItemStyle(isActive)}
          >
            {({ isActive }) => (
              <>
                <span style={{
                  display: "flex", alignItems: "center",
                  color: isActive ? "#6366f1" : isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)"
                }}>
                  {link.icon}
                </span>
                <span style={{ flex: 1 }}>{link.label}</span>
                {link.badge && (
                  <span style={{
                    fontSize: "0.6rem", fontWeight: 700,
                    background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                    color: "#fff",
                    padding: "2px 6px", borderRadius: "6px",
                    letterSpacing: "0.5px"
                  }}>
                    {link.badge}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}

        {/* Divider */}
        <div style={{ margin: "16px 20px", borderTop: `1px solid ${themeStyles.borderColor}` }} />

        {/* Settings */}
        <button
          onClick={() => setIsSettingsOpen(true)}
          style={{
            display: "flex", alignItems: "center", gap: "12px",
            padding: "12px 20px", margin: "4px 12px", width: "calc(100% - 24px)",
            borderRadius: "8px", fontWeight: 600, fontSize: "0.95rem",
            background: "transparent", border: "none",
            borderLeft: "3px solid transparent",
            color: themeStyles.inactiveLinkColor, cursor: "pointer", textAlign: "left"
          }}
        >
          <span style={{ display: "flex", alignItems: "center", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)" }}>
            <Settings size={18} />
          </span>
          Settings
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          style={{
            display: "flex", alignItems: "center", gap: "12px",
            padding: "12px 20px", margin: "4px 12px", width: "calc(100% - 24px)",
            borderRadius: "8px", fontWeight: 600, fontSize: "0.95rem",
            background: "transparent", border: "none",
            borderLeft: "3px solid transparent",
            color: themeStyles.inactiveLinkColor, cursor: "pointer", textAlign: "left"
          }}
        >
          <span style={{ display: "flex", alignItems: "center", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)" }}>
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </span>
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </button>
      </div>

      {/* Wallet + Logout */}
      <div style={{ padding: "20px 16px", borderTop: `1px solid ${themeStyles.borderColor}`, display: "flex", flexDirection: "column", gap: "12px" }}>
        <div
          onClick={() => {
            navigator.clipboard.writeText(walletAddress);
            const el = document.getElementById("wallet-copy-hint");
            if (el) { el.style.display = "block"; setTimeout(() => { el.style.display = "none"; }, 1500); }
          }}
          title="Click to copy wallet address"
          style={{
            background: themeStyles.walletBadgeBg, padding: "12px", borderRadius: "12px",
            display: "flex", alignItems: "center", gap: "10px",
            border: `1px solid ${isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.3)'}`,
            cursor: "pointer", transition: "all 0.2s",
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(99,102,241,0.6)"}
          onMouseLeave={e => e.currentTarget.style.borderColor = isDark ? "rgba(99,102,241,0.2)" : "rgba(99,102,241,0.3)"}
        >
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981", boxShadow: "0 0 10px #10b981" }} />
          <span style={{ color: themeStyles.activeLinkColor, fontSize: "0.85rem", fontFamily: "monospace", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px", flex: 1 }}>
            <Wallet size={14} />
            {shortenAddress(walletAddress)}
          </span>
          <span style={{ fontSize: "0.7rem", color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)" }}>📋</span>
        </div>

        <div id="wallet-copy-hint" style={{ display: "none", textAlign: "center", fontSize: "0.75rem", color: "#10b981", fontWeight: 600 }}>
          ✅ Copied!
        </div>

        <button
          onClick={handleLogout}
          style={{
            width: "100%", padding: "12px",
            background: isDark ? "rgba(239,68,68,0.1)" : "rgba(239,68,68,0.05)",
            border: isDark ? "1px solid rgba(239,68,68,0.2)" : "1px solid rgba(239,68,68,0.3)",
            borderRadius: "12px", color: "#ef4444", fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
          }}
        >
          <LogOut size={16} /> Logout
        </button>
      </div>
    </div>
  );

  return (
    <>
      <AnimatePresence>
        {isSettingsOpen && (
          <SettingsModal
            isDark={isDark}
            toggleTheme={toggleTheme}
            onClose={() => setIsSettingsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Desktop */}
      <div className="hidden md:block">{sidebarContent}</div>

      {/* Mobile top bar */}
      <div
        className="md:hidden fixed top-0 left-0 w-full z-40 p-4 flex justify-between items-center"
        style={{
          background: themeStyles.sidebarBg,
          backdropFilter: "blur(10px)",
          borderBottom: `1px solid ${themeStyles.borderColor}`
        }}
      >
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <div style={{ width: "28px", height: "28px", background: "linear-gradient(135deg, #6366f1, #4f46e5)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>💎</div>
          <span style={{ color: themeStyles.logoText, fontWeight: 700 }}>FreelanceChain</span>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{ background: "transparent", border: "none", color: themeStyles.activeLinkColor, fontSize: "24px", cursor: "pointer" }}
        >
          ☰
        </button>
      </div>

      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", zIndex: 45, backdropFilter: "blur(4px)" }}
              className="md:hidden"
            />
            <motion.div
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              style={{ zIndex: 50, position: "fixed", top: 0, left: 0 }}
              className="md:hidden"
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style>{`
        @media (min-width: 768px) { .md\\:block { display: block !important; } .md\\:hidden { display: none !important; } }
        @media (max-width: 767px) { .hidden { display: none; } }
      `}</style>
    </>
  );

};

export default Sidebar;