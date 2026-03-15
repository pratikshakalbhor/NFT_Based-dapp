# 🏗️ Architecture Document
## Stellar NFT dApp + Freelancer Escrow Platform

---

## 📋 Overview

A decentralized application (dApp) built on the **Stellar blockchain** that combines:
- NFT minting and marketplace
- XLM payments
- Trustless freelancer escrow system

**Live Demo:** https://nft-based-dapp.vercel.app  
**GitHub:** https://github.com/pratikshakalbhor/NFT_Based-dapp  
**Network:** Stellar Testnet

---

## 🏛️ System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                       │
│                                                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │Dashboard │  │ Payment  │  │  Escrow  │  │  Mint   │ │
│  │   Page   │  │   Page   │  │   Page   │  │   NFT   │ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │
│                                                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │ Gallery  │  │Marketplace│ │ Activity │  │ Profile │ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │
└─────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────┐    ┌──────────────────┐    ┌────────────┐
│   Wallet    │    │  Stellar Horizon │    │    IPFS    │
│  Services   │    │      API         │    │  (Pinata)  │
│             │    │                  │    │            │
│ • Freighter │    │ • Transactions   │    │ • NFT      │
│ • Albedo    │    │ • Account data   │    │   Images   │
│ • xBull     │    │ • Activity feed  │    │ • Metadata │
└─────────────┘    └──────────────────┘    └────────────┘
         │                    │
         ▼                    ▼
┌─────────────────────────────────────────────────────────┐
│              STELLAR BLOCKCHAIN (Testnet)                 │
│                                                           │
│  ┌─────────────────────┐   ┌─────────────────────────┐  │
│  │   NFT Contract      │   │   Escrow Contract        │  │
│  │                     │   │                          │  │
│  │ CARFS5Z4CE2GYSVFE.. │   │ CCOBX32ZBY7ZGN4M2EP..   │  │
│  │                     │   │                          │  │
│  │ Functions:          │   │ Functions:               │  │
│  │ • mint_nft()        │   │ • post_job()             │  │
│  │ • get_nft()         │   │ • accept_job()           │  │
│  │ • get_total()       │   │ • submit_work()          │  │
│  │ • balance()         │   │ • approve_and_pay()      │  │
│  │ • get_owner()       │   │ • cancel_job()           │  │
│  │ • get_name()        │   │ • get_job()              │  │
│  │ • get_image()       │   │ • get_total()            │  │
│  └─────────────────────┘   └─────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 🔄 Core Flows

### 1. NFT Minting Flow
```
User → Upload Image → IPFS (Pinata)
                          ↓
                    Get IPFS Hash
                          ↓
               Call mint_nft() on NFT Contract
                          ↓
               Wallet Sign Transaction (Freighter/Albedo)
                          ↓
               NFT stored on Stellar Blockchain
                          ↓
               Appears in Gallery + Marketplace
```

### 2. XLM Payment Flow
```
Sender → Enter Receiver Address + Amount
                    ↓
         Build Stellar Transaction
                    ↓
         Sign with Wallet
                    ↓
         Submit to Horizon
                    ↓
         Transaction recorded on Blockchain
                    ↓
         Activity page updated
```

### 3. Freelancer Escrow Flow
```
CLIENT                          FREELANCER
  │                                  │
  │ post_job(title, amount)          │
  │ → XLM locked in contract         │
  │                                  │
  │                    accept_job()  │
  │                    ← Job accepted│
  │                                  │
  │                    submit_work() │
  │                    ← Work URL    │
  │                                  │
  │ approve_and_pay()                │
  │ → XLM released to freelancer    │
  │ → NFT Certificate minted         │
  │                                  │
  ↓                                  ↓
Activity Updated              NFT in Gallery
```

---

## 🗂️ Project Structure

```
stellar-new/
├── .github/
│   └── workflows/
│       └── ci.yml              # CI/CD Pipeline
├── backend/
│   ├── server.js               # Express backend (IPFS proxy)
│   └── package.json
├── contract/
│   └── src/
│       └── lib.rs              # NFT Soroban Contract (Rust)
├── escrow_contract/
│   └── src/
│       └── lib.rs              # Escrow Soroban Contract (Rust)
├── src/
│   ├── assets/                 # Images
│   ├── components/
│   │   ├── Sidebar.js          # Left sidebar navigation
│   │   ├── ProfilePage.js      # Profile component
│   │   ├── Background.js       # Animated background
│   │   └── WalletModal.js      # Wallet connect modal
│   ├── context/
│   │   └── ThemeContext.js     # Dark/Light theme
│   ├── pages/
│   │   ├── DashboardPage.js    # Home dashboard
│   │   ├── PaymentPage.js      # XLM payments
│   │   ├── MintPage.js         # NFT minting
│   │   ├── GalleryPage.js      # NFT gallery
│   │   ├── MarketplacePage.js  # NFT marketplace
│   │   ├── ActivityPage.js     # Transaction history
│   │   └── EscrowPage.js       # Freelancer escrow
│   ├── utils/
│   │   ├── soroban.js          # Contract interactions
│   │   └── errorHandler.js     # Error handling
│   ├── App.js                  # Main app + routing
│   ├── WalletContext.js        # Wallet state management
│   ├── walletService.js        # Wallet connections
│   └── constants.js            # Contract IDs + config
└── public/
    └── screenshots/            # App screenshots
```

---

## 🔐 Smart Contracts

### NFT Contract
- **Contract ID:** `CARFS5Z4CE2GYSVFEQE4GWSUAFBWDJBWYGRFBYOHBKBTWEAXDXXZQXYX`
- **Language:** Rust (Soroban SDK 22.0.0)
- **Network:** Stellar Testnet
- **Functions:**
  | Function | Description |
  |----------|-------------|
  | `mint_nft(minter, owner, name, image_url)` | Mint new NFT |
  | `get_nft(id)` | Get NFT details |
  | `get_total()` | Total NFTs minted |
  | `balance(user)` | NFTs owned by user |
  | `get_owner(id)` | NFT owner |

### Escrow Contract
- **Contract ID:** `CCOBX32ZBY7ZGN4M2EPNX3BIAVTJFY673HH3RLDAJQQF3XDI3JJPZJTC`
- **Language:** Rust (Soroban SDK 22.0.0)
- **Network:** Stellar Testnet
- **Functions:**
  | Function | Description |
  |----------|-------------|
  | `post_job(client, title, desc, amount, token)` | Post job + lock XLM |
  | `accept_job(freelancer, job_id)` | Accept open job |
  | `submit_work(freelancer, job_id, url)` | Submit work |
  | `approve_and_pay(client, job_id, token)` | Approve + release XLM |
  | `cancel_job(client, job_id, token)` | Cancel + refund XLM |
  | `get_job(job_id)` | Get job details |
  | `get_total()` | Total jobs |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 |
| **Blockchain** | Stellar Testnet |
| **Smart Contracts** | Rust + Soroban SDK |
| **Wallet** | Freighter, Albedo, xBull |
| **Storage** | IPFS via Pinata |
| **Styling** | Tailwind CSS + Inline styles |
| **Animations** | Framer Motion |
| **Backend** | Node.js + Express |
| **CI/CD** | GitHub Actions |
| **Hosting** | Vercel (Frontend) |
| **SDK** | @stellar/stellar-sdk |

---

## 🌐 API & Services

### Stellar Horizon API
```
URL: https://horizon-testnet.stellar.org
Used for:
- Account balance
- Transaction history
- Submit transactions
- Stream events
```

### Soroban RPC
```
URL: https://soroban-testnet.stellar.org
Used for:
- Smart contract calls
- Contract simulation
- Contract deployment
```

### IPFS (Pinata)
```
Used for:
- NFT image upload
- Metadata storage
- Decentralized file hosting
```

---

## 🔒 Security

| Feature | Implementation |
|---------|---------------|
| **Wallet Auth** | require_auth() in every contract function |
| **XLM Escrow** | Locked in contract, released only on approval |
| **No Centralized DB** | All data on blockchain |
| **Multi-wallet** | Freighter + Albedo + xBull support |
| **HTTPS** | Vercel SSL certificate |

---

## ⚙️ CI/CD Pipeline

```
GitHub Push
    │
    ├── ✅ Run Tests (39 unit tests)
    ├── ✅ Build App (npm run build)
    ├── ✅ Check Rust Contract (cargo check)
    └── ✅ Deploy to Vercel (auto)
```

---

## 📊 Environment Variables

```
REACT_APP_CONTRACT_ID=CARFS5Z4CE2GYSVFEQE4GWSUAFBWDJBWYGRFBYOHBKBTWEAXDXXZQXYX
REACT_APP_ESCROW_CONTRACT_ID=CCOBX32ZBY7ZGN4M2EPNX3BIAVTJFY673HH3RLDAJQQF3XDI3JJPZJTC
REACT_APP_NETWORK=TESTNET
PINATA_API_KEY=<secret>
PINATA_SECRET_KEY=<secret>
```

---

## 👥 User Journey

### For Client (Job Poster):
1. Connect Freighter/Albedo wallet
2. Go to Escrow → Post Job
3. Enter title, description, XLM amount
4. XLM locked in smart contract
5. Review submitted work
6. Approve → XLM released automatically

### For Freelancer:
1. Connect wallet
2. Go to Escrow → Find Jobs
3. Accept available job
4. Submit work URL (IPFS link)
5. Receive XLM + NFT Certificate on approval

---

*Built for Rise In Stellar Quest - Level 5*
*Network: Stellar Testnet*