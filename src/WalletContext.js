import React, { createContext, useState, useContext, useEffect } from 'react';
import { connectFreighter, connectAlbedo, connectXBull, WALLET_TYPES } from './walletService';

const WalletContext = createContext();

export const useWallet = () => useContext(WalletContext);

export const WalletProvider = ({ children }) => {
  const [connectedWallets, setConnectedWallets] = useState([]);
  const [walletAddress, setWalletAddress] = useState(''); // Active wallet address
  const [walletType, setWalletType] = useState('');       // Active wallet type
  const [isModalOpen, setModalOpen] = useState(false);

  // Restore session
  useEffect(() => {
    const savedWalletsStr = localStorage.getItem('connectedWallets');
    const savedActiveAddress = localStorage.getItem('walletAddress');
    
    if (savedWalletsStr) {
      try {
        const wallets = JSON.parse(savedWalletsStr);
        setConnectedWallets(wallets);
        
        // Restore active wallet
        if (savedActiveAddress) {
          const active = wallets.find(w => w.address === savedActiveAddress);
          if (active) {
            setWalletAddress(active.address);
            setWalletType(active.type);
          } else if (wallets.length > 0) {
            // Fallback to first if active not found
            setWalletAddress(wallets[0].address);
            setWalletType(wallets[0].type);
          }
        }
      } catch (e) {
        console.error("Failed to parse wallet state", e);
      }
    } else {
      // Legacy support
      const savedType = localStorage.getItem('walletType');
      const savedAddress = localStorage.getItem('walletAddress');
      if (savedType && savedAddress) {
        const wallet = { address: savedAddress, type: savedType, name: savedType };
        setConnectedWallets([wallet]);
        setWalletType(savedType);
        setWalletAddress(savedAddress);
      }
    }
  }, []);

  // Persist state
  useEffect(() => {
    localStorage.setItem('connectedWallets', JSON.stringify(connectedWallets));
    if (walletAddress) {
      localStorage.setItem('walletAddress', walletAddress);
      localStorage.setItem('walletType', walletType);
    } else {
      localStorage.removeItem('walletAddress');
      localStorage.removeItem('walletType');
    }
  }, [connectedWallets, walletAddress, walletType]);

  const handleConnect = async (type) => {
    try {
      let result;
      switch (type) {
        case WALLET_TYPES.FREIGHTER:
          result = await connectFreighter();
          break;
        case WALLET_TYPES.ALBEDO:
          result = await connectAlbedo();
          break;
        case WALLET_TYPES.XBULL:
          result = await connectXBull();
          break;
        default:
          throw new Error('Invalid wallet type');
      }
      
      if (result && result.address) {
        const newWallet = {
          address: result.address,
          type: result.type,
          name: type.charAt(0) + type.slice(1).toLowerCase()
        };

        setConnectedWallets(prev => {
          if (prev.some(w => w.address === newWallet.address)) return prev;
          return [...prev, newWallet];
        });

        setWalletAddress(result.address);
        setWalletType(result.type);
        setModalOpen(false);
      }
    } catch (error) {
      console.error("Connection failed", error);
      alert(`Connection failed: ${error.message}`);
    }
  };

  const disconnectWallet = (address) => {
    const target = address || walletAddress;
    const newWallets = connectedWallets.filter(w => w.address !== target);
    setConnectedWallets(newWallets);

    if (target === walletAddress) {
      if (newWallets.length > 0) {
        setWalletAddress(newWallets[0].address);
        setWalletType(newWallets[0].type);
      } else {
        setWalletAddress('');
        setWalletType('');
      }
    }
  };

  const switchWallet = (address) => {
    const wallet = connectedWallets.find(w => w.address === address);
    if (wallet) {
      setWalletAddress(wallet.address);
      setWalletType(wallet.type);
    }
  };

  return (
    <WalletContext.Provider value={{
      walletAddress, walletType, connectedWallets,
      connectWallet: handleConnect, disconnectWallet, switchWallet,
      isModalOpen, setModalOpen
    }}>
      {children}
    </WalletContext.Provider>
  );
};