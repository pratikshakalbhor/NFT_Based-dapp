import { useState, useEffect, useMemo } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import * as StellarSdk from "@stellar/stellar-sdk";
import NavBar from "./components/navBar";
import { HORIZON_URL } from "./constants";
import Background from "./components/Background"; 
import { fetchNFTs } from "./utils/soroban";
import PaymentPage from "./pages/PaymentPage";
import MintPage from "./pages/MintPage";
import GalleryPage from "./pages/GalleryPage";
import MarketplacePage from "./pages/MarketplacePage";
import ActivityPage from "./pages/ActivityPage";
import { useWallet } from "./WalletContext";
import WalletModal from "./WalletModal";
import ProfilePage from "./components/ProfilePage";


function App() {
  const { walletAddress, setModalOpen } = useWallet();
  const [balance, setBalance] = useState("0");
  const [nfts, setNfts] = useState([]);
  const [accountDetails, setAccountDetails] = useState(null);

  const server = useMemo(
    () => new StellarSdk.Horizon.Server(HORIZON_URL),
    []
  );

  useEffect(() => {
    const fetchData = async () => {
      if (walletAddress) {
        // Fetch account, which includes balance
        try {
          const account = await server.loadAccount(walletAddress);
          setAccountDetails(account);
          const xlmBalance = account.balances.find(
            (b) => b.asset_type === "native"
          );
          setBalance(parseFloat(xlmBalance.balance).toFixed(2));
        } catch (e) {
          setAccountDetails(null);
          console.error("Failed to fetch balance:", e);
          setBalance("N/A");
        }

        // Fetch NFTs
        try {
          console.log("Fetching NFTs for", walletAddress);
          const userNfts = await fetchNFTs(walletAddress);
          console.log("Fetched NFTs:", userNfts);
          setNfts(userNfts);
        } catch (e) {
          console.error("Failed to fetch NFTs:", e);
          setNfts([]); // Reset on error
        }
      }
    };
    fetchData();
  }, [walletAddress, server]);

  return (
    <>
      <Background />
      <div className={`app-container relative z-10 ${walletAddress ? "loggedin" : "loggedout"}`}>
        <WalletModal />
        {walletAddress && <NavBar />}
        
        <Routes>
          <Route path="/login" element={
            !walletAddress ? (
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-purple-900/40 p-8 transition-all duration-300 hover:shadow-purple-600/50 hover:scale-[1.02] text-center max-w-[480px] w-full mt-[120px] mx-auto">
                <h1 className="title">Stellar Payment dApp</h1>
                <p className="subtitle">Connect your wallet to get started</p>
                <button
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium py-3 rounded-xl shadow-lg shadow-purple-900/40 transition-all duration-300 hover:scale-[1.03]"
                  onClick={() => setModalOpen(true)}
                >
                  Connect Wallet
                </button>
              </div>
            ) : <Navigate to="/" replace />
          } />

          <Route
            path="/"
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
        </Routes>
      </div>
    </>
  );
}

export default App;
