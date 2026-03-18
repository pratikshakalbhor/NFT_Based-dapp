import { useState, useEffect, useMemo } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import "./App.css";
import * as StellarSdk from "@stellar/stellar-sdk";
import Sidebar from "./components/Sidebar";
import { HORIZON_URL } from "./constants";
import Background from "./components/Background";
import { fetchNFTs } from "./utils/soroban";
import PaymentPage from "./pages/PaymentPage";
import MintPage from "./pages/MintPage";
import GalleryPage from "./pages/GalleryPage";
import MarketplacePage from "./pages/MarketplacePage";
import ActivityPage from "./pages/ActivityPage";
import EscrowPage from "./pages/EscrowPage";
import DashboardPage from "./pages/DashboardPage";
import { useWallet } from "./WalletContext";
import WalletModal from "./WalletModal";
import ProfilePage from "./components/ProfilePage";
import { errorHandler } from "./utils/errorHandler";
import ChatPage from "./pages/ChatPage";
import NotificationPanel from "./components/NotificationPanel";

import { useTheme } from "./context/ThemeContext";

function App() {
  const navigate = useNavigate();
  const { walletAddress, setModalOpen, disconnectWallet } = useWallet();
  const { isDark } = useTheme();
  const [balance, setBalance] = useState("0");
  const [nfts, setNfts] = useState([]);
  const [accountDetails, setAccountDetails] = useState(null);
  const [jobsPosted, setJobsPosted] = useState(0);

  const server = useMemo(
    () => new StellarSdk.Horizon.Server(HORIZON_URL),
    []
  );

  function showError(message, field) {
    alert(message);
  }

  useEffect(() => {
    const fetchData = async () => {
      if (walletAddress) {
        try {
          const account = await server.loadAccount(walletAddress);

          setAccountDetails(account);
          const xlmBalance = account.balances.find(
            (b) => b.asset_type === "native"
          );
          setBalance(parseFloat(xlmBalance.balance).toFixed(2));

        } catch (e) {
          setAccountDetails(null);
          const errorMessage = errorHandler(e);

          showError(
            `Error loading account (${walletAddress}): ${errorMessage}.`,
            "accountError"
          );

          console.error("Account error:", e);
          setBalance("N/A");
        }

        try {
          console.log("Fetching NFTs for", walletAddress);
          const userNfts = await fetchNFTs(walletAddress);
          console.log("Fetched NFTs:", userNfts);
          setNfts(userNfts);
        } catch (e) {
          console.error("Failed to fetch NFTs:", e);
          setNfts([]);
        }
      }
    };
    fetchData();
  }, [walletAddress, server]);

  return (
    <>
      <Background />
      <style>{`
        .main-content {
          flex: 1;
          width: 100%;
          min-height: 100vh;
          transition: margin-left 0.3s ease;
        }
        @media (min-width: 768px) {
          .main-content.with-sidebar {
            margin-left: 240px;
            width: calc(100% - 240px);
          }
        }
      `}</style>
      <div style={{ position: "relative", zIndex: 1, display: "flex", width: "100%", minHeight: "100vh" }}>
        <div
          className={`app-container ${walletAddress ? "loggedin" : "loggedout"}`}
          style={{
            display: "flex",
            width: "100%",
            color: isDark ? "#fff" : "#1a1a2e",
            minHeight: "100vh"
          }}
        >
          <WalletModal />

          {walletAddress && (
            <Sidebar
              walletAddress={walletAddress}
              onDisconnect={() => disconnectWallet()}
            />
          )}

          {/* Top Navigation Bar */}
          {walletAddress && (
            <div style={{
              position: "fixed",
              top: 0,
              left: "240px",
              right: 0,
              height: "60px",
              background: isDark ? "rgba(13,17,28,0.95)" : "rgba(255,255,255,0.95)",
              backdropFilter: "blur(12px)",
              borderBottom: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              padding: "0 24px",
              gap: "12px",
              zIndex: 40,
            }}>

              {/* Chat Icon */}
              <div
                onClick={() => navigate('/chat')}
                style={{
                  width: "38px", height: "38px",
                  background: "rgba(99,102,241,0.15)",
                  border: "1px solid rgba(99,102,241,0.3)",
                  borderRadius: "10px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                title="Chat"
              >
                <MessageCircle size={18} strokeWidth={2} color="#a78bfa" />
              </div>

              {/* Notification Icon */}
              <NotificationPanel walletAddress={walletAddress} />

              {/* Wallet Address */}
              <div style={{
                padding: "6px 14px",
                background: "rgba(99,102,241,0.15)",
                border: "1px solid rgba(99,102,241,0.3)",
                borderRadius: "10px",
                fontSize: "0.8rem",
                fontFamily: "monospace",
                color: isDark ? "#a78bfa" : "#6d28d9",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}>
                <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#10b981", boxShadow: "0 0 8px #10b981" }} />
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </div>

            </div>
          )}

          <main className={`main-content ${walletAddress ? 'with-sidebar' : ''}`}
            style={{ paddingTop: walletAddress ? "60px" : "0" }}
          >
            <Routes>
              {/* ✅ Mobile Responsive Login Page */}
              <Route path="/login" element={
                !walletAddress ? (
                  <div style={{
                    minHeight: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "16px",
                  }}>
                    <div style={{
                      background: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.95)",
                      backdropFilter: "blur(20px)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "24px",
                      padding: "clamp(24px, 6vw, 48px)",
                      width: "100%",
                      maxWidth: "480px",
                      textAlign: "center",
                      boxShadow: isDark ? "0 25px 50px rgba(88,28,135,0.4)" : "0 4px 24px rgba(0,0,0,0.1)",
                    }}>
                      <div style={{
                        width: "64px",
                        height: "64px",
                        background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                        borderRadius: "16px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 20px",
                        fontSize: "28px",
                      }}>
                        🌟
                      </div>

                      <h1 style={{
                        fontSize: "clamp(1.4rem, 5vw, 2rem)",
                        fontWeight: 700,
                        color: isDark ? "#fff" : "#1a1a2e",
                        marginBottom: "10px",
                        lineHeight: 1.2,
                      }}>FreelanceChain - DApp</h1>

                      <p style={{
                        fontSize: "clamp(0.85rem, 3vw, 1rem)",
                        color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                        marginBottom: "8px",
                      }}>Decentralized Freelancer Platform</p>

                      <p style={{
                        fontSize: "0.8rem",
                        color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)",
                        marginBottom: "32px",
                      }}>Connect your wallet to get started</p>



                      <button
                        style={{
                          width: "100%",
                          background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                          color: "#fff",
                          fontWeight: 600,
                          padding: "clamp(12px, 3vw, 16px)",
                          borderRadius: "14px",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "clamp(0.9rem, 3vw, 1rem)",
                          boxShadow: "0 8px 24px rgba(124,58,237,0.4)",
                          transition: "all 0.3s ease",
                        }}
                        onClick={() => setModalOpen(true)}
                        onMouseEnter={e => e.target.style.transform = "scale(1.02)"}
                        onMouseLeave={e => e.target.style.transform = "scale(1)"}
                      >
                        Connect Wallet
                      </button>

                      <p style={{
                        marginTop: "20px",
                        fontSize: "0.75rem",
                        color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)",
                      }}>
                        Supports Freighter • Albedo • xBull
                      </p>
                    </div>
                  </div>
                ) : <Navigate to="/" replace />
              } />

              <Route
                path="/"
                element={
                  walletAddress ? (
                    <div className="pages-container">
                      <DashboardPage
                        walletAddress={walletAddress}
                        balance={balance}
                        nfts={nfts}
                        jobs={[]}
                      />
                    </div>
                  ) : <Navigate to="/login" replace />
                }
              />
              <Route
                path="/payment"
                element={
                  walletAddress ? (
                    <div className="pages-container">
                      <PaymentPage
                        walletAddress={walletAddress}
                        balance={balance}
                        setBalance={setBalance}
                        server={server}
                      />
                    </div>
                  ) : <Navigate to="/login" replace />
                }
              />
              <Route
                path="/mint"
                element={
                  walletAddress ? (
                    <div className="pages-container">
                      <MintPage
                        walletAddress={walletAddress}
                        server={server}
                        setBalance={setBalance}
                        setNfts={setNfts}
                        nfts={nfts}
                      />
                    </div>
                  ) : <Navigate to="/login" replace />
                }
              />
              <Route
                path="/profile"
                element={
                  walletAddress ? (
                    <div className="pages-container">
                      <ProfilePage account={accountDetails} nfts={nfts} />
                    </div>
                  ) : <Navigate to="/login" replace />
                }
              />
              <Route
                path="/gallery"
                element={
                  walletAddress ? (
                    <div className="pages-container">
                      <GalleryPage nfts={nfts} />
                    </div>
                  ) : <Navigate to="/login" replace />
                }
              />
              <Route
                path="/marketplace"
                element={
                  walletAddress ? (
                    <div className="pages-container">
                      <MarketplacePage walletAddress={walletAddress} nfts={nfts} server={server} />
                    </div>
                  ) : <Navigate to="/login" replace />
                }
              />
              <Route
                path="/activity"
                element={
                  walletAddress ? (
                    <div className="pages-container">
                      <ActivityPage walletAddress={walletAddress} />
                    </div>
                  ) : <Navigate to="/login" replace />
                }
              />
              <Route
                path="/chat"
                element={
                  walletAddress ? (
                    <div className="pages-container">
                      <ChatPage />
                    </div>
                  ) : <Navigate to="/login" replace />
                }
              />
              <Route
                path="/escrow"
                element={
                  walletAddress ? (
                    <div className="pages-container">
                      <EscrowPage
                        walletAddress={walletAddress}
                        server={server}
                        onJobPosted={() => setJobsPosted(jobsPosted + 1)}
                        onJobAccepted={(jobId) => {
                          console.log("Job accepted:", jobId);
                        }}
                        onWorkSubmitted={() => console.log("Work Submitted")}
                        onPaymentReleased={async (jobId) => {
                          // Refresh balance
                          try {
                            const account = await server.loadAccount(walletAddress);
                            const xlm = account.balances.find(b => b.asset_type === "native");
                            setBalance(parseFloat(xlm.balance).toFixed(2));
                          } catch (e) { console.error("Balance refresh error:", e); }
                          // Refresh NFTs
                          try {
                            const userNfts = await fetchNFTs(walletAddress);
                            setNfts(userNfts);
                          } catch (e) { console.error("NFT refresh error:", e); }
                        }}
                      />
                    </div>
                  ) : <Navigate to="/login" replace />
                }
              />
              <Route
                path="/dashboard"
                element={<Navigate to="/" replace />}
              />
            </Routes>
          </main>
        </div>
      </div>
    </>
  );
}

export default App;
