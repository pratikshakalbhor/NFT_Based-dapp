import { useState, useEffect, useMemo } from "react";
import { Routes, Route } from "react-router-dom";
import "./App.css";
import * as StellarSdk from "@stellar/stellar-sdk";
import NavBar from "./components/navBar";
import { HORIZON_URL } from "./constants";
import { fetchNFTs } from "./utils/soroban";
import PaymentPage from "./pages/PaymentPage";
import MintPage from "./pages/MintPage";
import GalleryPage from "./pages/GalleryPage";
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
    <div className={`app-container ${walletAddress ? "loggedin" : "loggedout"}`}>
      <WalletModal />
      {!walletAddress ? (
        <div className="card">
          <h1 className="title">Stellar Payment dApp</h1>
          <p className="subtitle">Connect your wallet to get started</p>
          <button
            className="button button-primary button-large"
            onClick={() => setModalOpen(true)}
          >
            Connect Wallet
          </button>
        </div>
      ) : (
        <>
          <NavBar />
          <div className="pages-container">
            <Routes>
              <Route
                path="/"
                element={
                  <PaymentPage
                    walletAddress={walletAddress}
                    balance={balance}
                    setBalance={setBalance}
                    server={server}
                  />
                }
              />
              <Route
                path="/mint"
                element={
                  <MintPage
                    walletAddress={walletAddress}
                    server={server}
                    setBalance={setBalance}
                    setNfts={setNfts}
                    nfts={nfts}
                  />
                }
              />
              <Route
                path="/profile"
                element={<ProfilePage account={accountDetails} nfts={nfts} />}
              />
              <Route path="/gallery" element={<GalleryPage nfts={nfts} />} />
            </Routes>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
