# 🌟 Decentralized Freelancer Escrow Platform
### Level 5 — Blue Belt Submission | Rise In Stellar Quest

A full-stack decentralized application built on Stellar Testnet combining NFT minting, XLM payments, and a trustless freelancer escrow system — like **Fiverr on blockchain** with zero middleman fees.

---

## 🚀 Live Demo & Video

| | Link |
|---|---|
| 🌐 **Live Demo** | https://nft-based-dapp.vercel.app/login |
| 📹 **Demo Video** | https://drive.google.com/file/d/1x3azpS7cS6JXB5bEXG07bxpUbHcTRg0u/view?usp=sharing |
| 📂 **GitHub** | https://github.com/pratikshakalbhor/FreelanceChain |

---

## 💡 What is this?

> A client posts a job and locks XLM in a smart contract. A freelancer accepts, does the work, and submits a URL. The client approves → XLM is released automatically + NFT Certificate is minted for the freelancer as proof of work. Zero middleman. Zero trust required.

---

## ✨ Features

| Feature | Level | Status |
|---------|-------|--------|
| Wallet Connect (Freighter + Albedo + xBull) | L1 | ✅ |
| XLM Payments | L1 | ✅ |
| Mint NFT via Soroban + IPFS | L2 | ✅ |
| NFT Gallery + Search | L2 | ✅ |
| NFT Marketplace (Buy/Sell for XLM) | L2 | ✅ |
| Activity Feed with TX type labels | L2 | ✅ |
| 39 Unit Tests | L3 | ✅ |
| CI/CD Pipeline | L4 | ✅ |
| Custom SNFT Token + Inter-contract calls | L4 | ✅ |
| Mobile Responsive | L4 | ✅ |
| **Freelancer Escrow System** | **L5** | ✅ |
| **Auto NFT Certificate on job completion** | **L5** | ✅ |
| **Full Profile with reputation score** | **L5** | ✅ |
| **5+ Real Testnet Users** | **L5** | ✅ |
| **User Feedback + Iteration** | **L5** | ✅ |

---
## 📝 User Feedback

🔗 **Feedback Form:** `https://docs.google.com/forms/d/e/1FAIpQLScnjiIULj3f7_4YY1VNo8slwi_C4jf8xQzIOsoceJM5Q4mXrw/viewform?usp=publish-editor`

---
## 👥 Testnet Users (5+ Real Users)

---

## 📝 User Feedback Summary



📄 **Full Feedback Document:** 

---

## 🔄 Iteration (Based on Feedback)

| Feedback | Change Made | Status |
|----------|------------|--------|
| Albedo popup not opening | Fixed network param: `"TESTNET"` → `"testnet"` | ✅ Done |
| "Escrow" name confusing | Renamed to "Jobs" in Sidebar | ✅ Done |
| TX type not visible in Activity | Added NFT/Payment/Job labels with icons | ✅ Done |
| Dashboard Jobs count = 0 | Fixed: fetches real count from Soroban contract | ✅ Done |
| Add chat feature | Planned for Level 6 | 🔄 Planned |

---

## 🏗️ How the Escrow Works

```
CLIENT                              FREELANCER
  │                                      │
  │ 1. approve() XLM SAC                 │
  │ 2. post_job() → XLM locked           │
  │                                      │
  │                    3. accept_job()   │
  │                    4. submit_work()  │
  │                                      │
  │ 5. approve_job()                     │
  │    → XLM released ✅                 │
  │    → NFT Certificate minted ✅       │
```

---

## 🔐 Smart Contracts

### NFT Contract
- **ID:** `CBLKPYQ6TSJB5QVLEZW2XF4UJBJIUATTRDIUMODUIKC3RGBQ4XSGL5U5`
- Functions: `mint_nft`, `get_nft`, `get_total`, `balance`, `get_owner`

### Escrow Contract
- **ID:** `CD4VIT3HJQKWAWU62PM2QPTWFMNMZKVU2RNRQR3KXFR5XQU6EUKT7MPK`
- Functions: `post_job`, `accept_job`, `submit_work`, `approve_job`, `cancel_job`, `get_job`, `get_total`

### Native XLM SAC
- **Address:** `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Tailwind CSS, Framer Motion |
| Blockchain | Stellar Testnet (Soroban) |
| Smart Contracts | Rust + Soroban SDK |
| Wallets | Freighter, Albedo, xBull |
| Storage | IPFS via Pinata |
| SDK | @stellar/stellar-sdk |
| Backend | Node.js + Express |
| CI/CD | GitHub Actions |
| Hosting | Vercel |
| Testing | Jest (39 tests) |

---

## ⚙️ Setup & Run

### 1. Clone & Install
```bash
git clone https://github.com/pratikshakalbhor/FreelanceChain
cd stellar-new
npm install
```

### 2. Environment Variables
```env
REACT_APP_CONTRACT_ID=CBLKPYQ6TSJB5QVLEZW2XF4UJBJIUATTRDIUMODUIKC3RGBQ4XSGL5U5
REACT_APP_ESCROW_CONTRACT_ID=CD4VIT3HJQKWAWU62PM2QPTWFMNMZKVU2RNRQR3KXFR5XQU6EUKT7MPK
REACT_APP_NETWORK=TESTNET
PINATA_API_KEY=your_key
PINATA_SECRET_KEY=your_secret
```

### 3. Run
```bash
# Backend (IPFS proxy)
cd backend && node server.js

# Frontend
npm start
```

### 4. Tests
```bash
npm test
# 39 tests passing 
```

## 🔗 Explorer Links
 
| Resource | Link |
|----------|------|
| 🔍 NFT Contract | [stellar.expert](https://stellar.expert/explorer/testnet/tx/5d443fa90009166cc963fcbbb6cf46457683777e28d45bcbd653a6ce9e772078) |
| 🔍 Escrow Contract | [stellar.expert](https://stellar.expert/explorer/testnet/tx/b876a0c829087b1a3c3c881cbfde941f8253f596ee3a74396a7834c2c67756ad) |
| 🔍 My Wallet | [stellar.expert](https://stellar.expert/explorer/testnet/tx/3bc8c25758cceaf7e3c28299c7c3d49b7233e0a222700823f1fb1d68b470d5da) |
| 🌐 Stellar Expert | [stellar.expert/explorer/testnet](https://stellar.expert/explorer/testnet/tx/89966e106d2003338a9d4112732b086130c7a46eea63d3f0e5ead1180bedfc2b) | 

---

## 📱 Mobile Responsive
<img width="1592" height="848" alt="Image" src="https://github.com/user-attachments/assets/3553f6e5-d980-48d2-8856-747e9703c504" />

## ⚙️ CI/CD Pipeline
<img width="1482" height="592" alt="image" src="https://github.com/user-attachments/assets/bb306b8d-fed8-4fb8-93bb-8d22c4af2edc" />

---

## 📸 Screenshots

### Wallet Connection
<img width="1568" height="818" alt="Image" src="https://github.com/user-attachments/assets/ae75308c-6584-49b0-908e-921f5429fbd0" />

### Dashboard
<img width="1901" height="907" alt="Image" src="https://github.com/user-attachments/assets/67b63292-46f5-4705-94d4-06ce7667dc8a" />

### Jobs (Escrow) — Post Job
<img width="1918" height="907" alt="Image" src="https://github.com/user-attachments/assets/7f78c65e-562c-420a-baa9-18c975496647" />

### Jobs — In Progress
<img width="1907" height="907" alt="Image" src="https://github.com/user-attachments/assets/331804e1-a61c-4bc5-b5e3-da4074ab15e4" />

### Jobs - Find Job
<img width="1901" height="900" alt="Image" src="https://github.com/user-attachments/assets/c4f49873-e319-412e-b106-298ee47c5539" />

### Jobs - MyJob
<img width="1901" height="906" alt="Image" src="https://github.com/user-attachments/assets/73fb43dd-f3bf-4a61-a928-b5c9eb5a8c2b" />

### Payment
<img width="1906" height="902" alt="Image" src="https://github.com/user-attachments/assets/af168003-a412-44ab-84a9-32de1818347c" />

### NFT Minting
<img width="1903" height="901" alt="Image" src="https://github.com/user-attachments/assets/4018822a-b569-4110-a949-d8dc005dab1e" />
<img width="1897" height="912" alt="Image" src="https://github.com/user-attachments/assets/95a17d44-2c21-4567-85a2-624125e1e335" />

### NFT Gallery
<img width="1908" height="902" alt="Image" src="https://github.com/user-attachments/assets/7eacc69c-b587-42e4-b95e-775c88357910" />

### Marketplace
<img width="1915" height="905" alt="Image" src="https://github.com/user-attachments/assets/f917e82a-9f2a-4adc-a085-fc9398020e16" />

### Activity Feed
<img width="1906" height="905" alt="Image" src="https://github.com/user-attachments/assets/47788e66-1a50-465c-abc0-754466f97abc" />

### Profile Page
<img width="1900" height="902" alt="Image" src="https://github.com/user-attachments/assets/49e8b48b-3162-41a6-8526-f36bfe23bb6a" />
   
---

## 🪙 Custom Token — SNFT

| Property | Value |
|----------|-------|
| Name | Stellar NFT Token |
| Symbol | SNFT |
| Network | Stellar Testnet |
| Reward per Mint | 10 SNFT |
| Contract Type | Soroban |

---

## 📁 Project Structure

```
stellar-new/
├── .github/workflows/ci.yml       # CI/CD
├── backend/server.js               # IPFS proxy
├── contract/escrow_contract/
│   └── src/lib.rs                  # Escrow Contract (Rust)
├── src/
│   ├── pages/
│   │   ├── DashboardPage.js        # Overview + stats
│   │   ├── EscrowPage.js           # Jobs (Escrow)
│   │   ├── MintPage.js             # NFT minting
│   │   ├── GalleryPage.js          # NFT gallery
│   │   ├── MarketplacePage.js      # Buy/Sell NFTs
│   │   ├── ActivityPage.js         # TX history
│   │   └── PaymentPage.js          # XLM payments
│   ├── components/
│   │   ├── Sidebar.js              # Navigation
│   │   └── ProfilePage.js          # Full profile
│   ├── walletService.js            # Wallet connections
│   └── constants.js                # Contract IDs
└── docs/
    ├── ARCHITECTURE.md             # Architecture document
    └── User_Feedback_Documentation.docx
```

---

## 🔗 Useful Links

- [Stellar Expert Explorer](https://stellar.expert/explorer/testnet)
- [Friendbot — Fund Account](https://friendbot.stellar.org)
- [Soroban Docs](https://soroban.stellar.org)
- [Architecture Document](docs/ARCHITECTURE.md)
- [User Feedback](docs/User_Feedback_Documentation.docx)

---

*Built for Rise In Stellar Quest — Level 5 Blue Belt | March 2026*
