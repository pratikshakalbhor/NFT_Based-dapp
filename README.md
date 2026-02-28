# Stellar NFT Reward dApp

A full-stack decentralized application built on Stellar Testnet.
Users can connect their wallet, mint NFTs, view them in a gallery, and verify transactions on-chain.

## Table of Contents

- [Technologies Used](#technologies-used)
- [Smart Contract Info](#smart-contract-info)
- [Application Features](#application-features)
- [Folder Structure](#folder-structure)
- [Screenshots](#screenshots)
- [Testing](#testing)
- [Live Demo](#live-demo)
- [Project Setup Guide](#project-setup-guide)
- [Level Progression](#level-progression)

## Technologies Used

- **Smart Contract:** Rust, Soroban-SDK
- **Wallet:** Freighter (Chrome Extension)
- **Frontend:** ReactJS
- **Styling:** CSS / TailwindCSS
- **Blockchain Integration:** Stellar-SDK
- **Routing:** React Router
- **Testing:** Jest

## Smart Contract Info

**Smart contract path:**
```bash
./contract/src/lib.rs
```

**Deployed Contract Address:**
`YOUR_CONTRACT_ADDRESS`

**View on Explorer:**
Stellar Expert Explorer

## Application Features

- Wallet Connect (Freighter)
- NFT Minting
- NFT Gallery
- Profile Page
- Transaction Hash Display
- Explorer Link Integration
- Loading States
- Responsive UI
- 3+ Passing Tests

## Folder Structure

```text
stellar-nft-dapp/
│
├── contract/
│   └── src/
│       └── lib.rs
│
├── public/
│
├── src/
│   ├── components/
│   │   ├── NavBar.jsx
│   │   ├── ProfileViewer.jsx
│   │   ├── WalletModal.jsx
│   │   └── Soroban.js
│   │
│   ├── pages/
│   │   ├── PaymentPage.jsx
│   │   ├── MintPage.jsx
│   │   ├── GalleryPage.jsx
│   │   └── ProfilePage.jsx
│   │
│   ├── context/
│   │   └── WalletContext.js
│   │
│   ├── utils/
│   │   ├── imageMap.js
│   │   └── soroban.js
│   │
│   ├── App.js
│   └── index.js
│
├── package.json
└── README.md
```

## Screenshots

> **Important:** Create a folder in root: `/screenshots` and put all images there.

### Wallet Connection
!Wallet Connection

### NFT Minting
!NFT Minting

### NFT Gallery
!NFT Gallery

### Profile Page
!Profile Page

### Test Output (3+ Tests Passing)
!Test Output

## Testing

Run tests:
```bash
npm test
```
Minimum 3 tests passing.

**Example tests:**
- Renders Mint Page
- Wallet Connect Button appears
- NFT Card renders correctly

## Live Demo

- **Live Application:** https://your-vercel-link.com
- **Demo Video (1 minute):** https://your-video-link.com

## Project Setup Guide

1. Install NodeJS, Rust, Stellar CLI.
2. Install Freighter wallet.
3. Clone repository:
   ```bash
   git clone https://github.com/YOUR-USERNAME/YOUR-REPO.git
   ```
4. Install dependencies:
   ```bash
   npm install
   ```
5. Run project:
   ```bash
   npm start
   ```
6. Run tests:
   ```bash
   npm test
   ```

## Level Progression

### Level 1
- Wallet Integration
- Stellar Payment
- Transaction Hash Display

### Level 2
- NFT Minting
- NFT Gallery
- Profile Section

### Level 3
- Complete Mini dApp
- Routing
- Loading States
- 3+ Passing Tests
- Documentation
- Demo Video

