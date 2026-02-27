import React from 'react';
import { ProfileViewer } from './ProfileViewer';
import LoadingSpinner from './LoadingSpinner';
import './ProfilePage.css';

const ProfilePage = ({ account, nfts, isLoading }) => {
  const nftCount = nfts ? nfts.length : 0;

  return (
    <div className="profile-page-container">
      <ProfileViewer account={account} nftCount={nftCount} />
      
      <div className="collection-section">
        <div className="collection-header">
          <h2 className="collection-title">My NFT Collection</h2>
          <div className="collection-stats">
            <span className="total-items">{nftCount} items</span>
          </div>
        </div>
        
        {isLoading ? (
          <div className="loading-container">
            <LoadingSpinner />
            <p className="loading-text">Loading your NFT collection...</p>
          </div>
        ) : nfts && nfts.length > 0 ? (
          <div className="nft-grid">
            {nfts.map((nft, index) => (
              <div className="nft-card" key={index}>
                <div className="nft-image-container">
                  <img src={nft.imageUrl} alt={nft.name} className="nft-image" />
                  <div className="nft-overlay">
                    <span className="nft-index">#{index + 1}</span>
                  </div>
                </div>
                <div className="nft-info">
                  <h3 className="nft-name">{nft.name}</h3>
                  {nft.description && (
                    <p className="nft-description">{nft.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
            </div>
            <h3 className="empty-title">No NFTs Yet</h3>
            <p className="empty-description">
              You don't own any NFTs yet. Go to the Mint page to create your first one!
            </p>
            <button className="mint-button">
              Create Your First NFT
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
