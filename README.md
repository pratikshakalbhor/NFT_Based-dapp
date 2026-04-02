# 🌟 Decentralized Freelancer Escrow Platform
### Level 5 — Blue Belt Submission | Rise In Stellar Quest

A full-stack decentralized application built on Stellar Testnet combining NFT minting, XLM payments, and a trustless freelancer escrow system — like **Fiverr on blockchain** with zero middleman fees.

---

## 🚀 Live Demo & Video

| | Link |
|---|---|
| 🌐 **Live Demo** | https://freelancechain-dapp.vercel.app/login |
| 📹 **Demo Video** | https://drive.google.com/file/d/1x3azpS7cS6JXB5bEXG07bxpUbHcTRg0u/view?usp=sharing |
| 📂 **GitHub** | https://github.com/pratikshakalbhor/FreelanceChain |
---

## 🐦 Community Contribution
[Twitter Post](https://x.com/PratikshaK61510/status/2039695252710469654)

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

🔗 **Feedback Form:** https://docs.google.com/forms/d/e/1FAIpQLScnjiIULj3f7_4YY1VNo8slwi_C4jf8xQzIOsoceJM5Q4mXrw/viewform?usp=publish-editor

 **Response Sheet:** https://docs.google.com/spreadsheets/d/1HZBbu-YZKPYKPvBpQO9JgqwQ8d-HiTKqCquwiilamLc/edit?resourcekey=&gid=9050602#gid=9050602

---
## 👥 Testnet Users (5+ Real Users)
 
| No. | Wallet Address | Explorer | 
|-----|---------------|---------|
| 1 | `GDUXWQNSPNM5GUMP3KWXSNOY62GRKPRHUD6IKDJORCRET7CWBKQ3TVR4` | [View](https://stellar.expert/explorer/testnet/tx/902bb81d0cf155409a12de16cd78020965345c5c3cc793e51d4b6f31965db8bc) |
| 2 | `GA2X7BNO3NIKEJWEN2USL53LSSD7JN4JQTIGR6NEIRO72VOGKEF6FQPF` | [View](https://stellar.expert/explorer/testnet/tx/cf51188505d35d13c31e17018b87145b48a6cac08976a73e9f912f86f1afedac) | 
| 3 | `GD4ZFHMXWXFX47G4TIFLSJVG32WUMV7MVUD35DKVTAELXGAJEXUQWWKX` | [View](https://stellar.expert/explorer/testnet/tx/692475d7177a0c9856f82804ab23a1f416f50d731f025526975b3b60b5a5c178) | 
| 4 | `GBZHZSGVKSROKQPUD3QHQWF42YDE3PPFUINEKW3NZ2NLOZXNLM7UVQW4` | [View](https://stellar.expert/explorer/testnet/tx/6a79ec475e1eca87d63ba5dc9ffbeb19e088b8e322ece609a5f448534a7cbe3d) | 
| 5 | `GCYO66SNVSGBBJB3LDGDIGNTW5Y7H4FEWF65MU4BBH7YSXDRYZWWMY6C` | [View](https://stellar.expert/explorer/testnet/tx/09b5fdbb22d9b7ba5d08a0e2c900f0ff9f237e5fcb7f15446808d1fd878d5243) | 
| 6 | `GA5MTCRXRKYBBDRWJT2CPAAXFG4BCQUDR6V6JYMGQWOR6ATB2JJJRRYW` | [View]() | 
 

 ## 🔄 Iteration (Based on Feedback)
 
| Feedback | Change Made | Status |
|----------|-------------|--------|
| Albedo popup not opening | Fixed network param: `"TESTNET"` → `"testnet"` | ✅ Done |
| "Escrow" name confusing | Renamed to "Jobs" in Sidebar | ✅ Done |
| TX type not visible in Activity | Added NFT/Payment/Job labels with icons | ✅ Done |
| Dashboard Jobs count = 0 | Fixed: fetches real count from Soroban contract | ✅ Done |
| Add chat feature | Implemented Firebase real-time chat | ✅ Done |
| Reducing load times | Parallel fetch with Promise.all() | ✅ Done |
| NFT Marketplace price range | Min/Max XLM price filter added | ✅ Done |
| Add Search box in job page | Instant keyword search implemented | ✅ Done |

## 🔄 User Feedback Implementation

### Selected Feedback Items:

**1. "Add chat feature between client and freelancer"**
- Implemented Firebase real-time chat in `src/pages/ChatPage.js`
- Job-based chat rooms — no wallet address needed
- Real-time notifications via Firebase Realtime Database
- **Commit:** `40bb7fa` — User Feedback: Add chat feature between client and freelancer: Fixed ✅

**2. "Reducing load times would improve experience"**
- Implemented parallel fetch using `Promise.all()` in `src/utils/soroban.js`
- NFTs and Jobs load simultaneously instead of sequentially
- **Commit:** `a65f2db` — User Feedback: Reducing load times would improve experience: Fixed ✅


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
Transaction hash = 
REACT_APP_CONTRACT_ID=CBFGZCD2HZK35OAP7MCX3JEEHKGQLUSEOG3SPPCU43PTWEIOGFKEEPVC
REACT_APP_ESCROW_CONTRACT_ID=CBNGQSH743IQE7JMT3YFPC4J4LNO4B73HHP2NAHDGIPD3TVL6WI7A2S3
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
| NFT Transaction Hash| 9e4c99076dc055632629722c7423eb6212ee613e057af647487147f1bd369c5f |
| NFT Explorer Link | https://stellar.expert/explorer/testnet/tx/9e4c99076dc055632629722c7423eb6212ee613e057af647487147f1bd369c5f |
| 🔍 NFT Contract | [stellar.expert](https://stellar.expert/explorer/testnet/tx/5d443fa90009166cc963fcbbb6cf46457683777e28d45bcbd653a6ce9e772078) |
| 🔍 Escrow Contract | [stellar.expert](https://stellar.expert/explorer/testnet/tx/b876a0c829087b1a3c3c881cbfde941f8253f596ee3a74396a7834c2c67756ad) |
| 🔍 My Wallet | [stellar.expert](https://stellar.expert/explorer/testnet/tx/3bc8c25758cceaf7e3c28299c7c3d49b7233e0a222700823f1fb1d68b470d5da) |
| 🌐 Stellar Expert | [stellar.expert/explorer/testnet](https://stellar.expert/explorer/testnet/tx/89966e106d2003338a9d4112732b086130c7a46eea63d3f0e5ead1180bedfc2b) | 

---

## 📱 Mobile Responsive
<img width="1043" height="850" alt="Screenshot 2026-03-21 150906" src="https://github.com/user-attachments/assets/5c17c08d-cfc0-4f6b-ba8a-504e585a44fd" />

## ⚙️ CI/CD Pipeline
<img width="1482" height="592" alt="image" src="https://github.com/user-attachments/assets/bb306b8d-fed8-4fb8-93bb-8d22c4af2edc" />

---

## 📸 Screenshots

### Wallet Connection
<img width="1919" height="902" alt="Screenshot 2026-03-16 091931" src="https://github.com/user-attachments/assets/05f23a97-3b60-482c-a587-9a3ca7782d72" />

### Dashboard
<img width="1917" height="896" alt="Screenshot 2026-03-21 151006" src="https://github.com/user-attachments/assets/2bec74a9-5a25-449f-8e79-e44e8558fade" />

### Jobs (Escrow) — Post Job
<img width="1890" height="902" alt="image" src="https://github.com/user-attachments/assets/0c56e93f-4317-4f38-93d7-b7eb64cd4a02" />

### Jobs — In Progress
<img width="1896" height="906" alt="image" src="https://github.com/user-attachments/assets/4aa739a1-047a-45f2-a3ae-3463d14029cf" />

### Jobs - Find Job
<img width="1888" height="903" alt="image" src="https://github.com/user-attachments/assets/7fa44e1c-2d1e-486b-9e38-d4cb440d92ee" />

### Jobs - MyJob
<img width="1897" height="911" alt="image" src="https://github.com/user-attachments/assets/6a0e3585-9a0d-4b38-a1bb-f6bc9c012429" />

### FreelanceChain Chat
<img width="1917" height="898" alt="image" src="https://github.com/user-attachments/assets/4a3b3d1c-833f-407d-b2e0-0e10946ef2a0" />

### Payment
<img width="1905" height="912" alt="image" src="https://github.com/user-attachments/assets/e8537bea-1a11-47ae-b3b4-75fc1a49ad04" />

### NFT Minting
<img width="1907" height="911" alt="image" src="https://github.com/user-attachments/assets/76fb673e-331b-48cc-84df-d66a14d7150f" />
<img width="1907" height="898" alt="image" src="https://github.com/user-attachments/assets/c508fd99-63a6-4f1b-bffd-2caabdf290bf" />

### NFT Gallery
<img width="1893" height="910" alt="image" src="https://github.com/user-attachments/assets/c9ade496-2175-4996-8701-2d57e59d2a12" />

### Marketplace
<img width="1892" height="897" alt="image" src="https://github.com/user-attachments/assets/6ad34be2-b7c8-423e-b824-98471fa9c684" />

### Activity Feed
<img width="1897" height="906" alt="image" src="https://github.com/user-attachments/assets/d7d86844-0977-4092-aa51-d54aeee3f638" />

### Profile Page
<img width="1881" height="901" alt="image" src="https://github.com/user-attachments/assets/79559b09-d06a-4b0c-89f0-63479b8bc945" />

### Test Output (3+ Tests Passing)
<img width="1506" height="914" alt="Screenshot 2026-03-16 130131" src="https://github.com/user-attachments/assets/895b84c9-bac0-4179-ad0b-4fbdfd364d28" />

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
