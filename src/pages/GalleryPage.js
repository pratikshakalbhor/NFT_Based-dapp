import React from "react";
import { getImageById } from "../utils/imageMap";
import "../utils/GalleryPage.css";

export default function GalleryPage({ nfts }) {
  if (!nfts || nfts.length === 0) {
    return (
      <div className="card">
        <h2>No NFTs minted yet</h2>
      </div>
    );
  }

  return (
    <div className="card">
      <h1>My NFT Gallery</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: "16px",
          marginTop: "20px",
        }}
      >
        {nfts.map((nft, index) => {
          // Handle both imageId and image field safely
          const imageKey = (nft.imageId || nft.image || "").toUpperCase();

          const imageSrc =
            getImageById(imageKey) ||
            "https://via.placeholder.com/200?text=No+Image";

          return (
            <div key={index} className="nft-preview-card">
              <img
                src={imageSrc}
                alt={nft.name || "NFT"}
                className="preview-image"
                loading="lazy"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src =
                    "https://via.placeholder.com/200?text=Image+Error";
                }}
              />

              <p
                className="preview-name"
                style={{
                  color: "#06070a",
                  fontWeight: "600",
                  marginTop: "0.5rem",
                }}
              >
                {nft.name || "Unnamed NFT"}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}