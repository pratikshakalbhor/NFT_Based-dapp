
# 🌟 Stellar NFT dApp 

> Production-ready NFT dApp with **inter-contract calls**, **custom SNFT reward token** on Stellar Testnet.
> A full-stack decentralized application built on Stellar Testnet. Users can connect their wallet, mint NFTs, view them in a gallery, and verify transactions on-chain.

---

## 🚀 Live Demo

📹 **Demo Video:** https://drive.google.com/file/d/1VqA4rUtSywQL947pCeHwyqXz2nJtDg0E/view?usp=sharing

---
**Deployed Contract Address:**
CAY3O4WNR3H7T4ARQIXNPITJPHWY7ZRMINGQR2TQBHDQJXDEBR33OKFP

**View on Explorer:**
https://stellar.expert/explorer/testnet/tx/23fac9f8ac14a0b9cde986dad60713ed69fee18a4656cb15a2e787133c24269f

---

---
## Screenshots
### Wallet 
<img width="1891" height="908" alt="Screenshot 2026-03-06 153225" src="https://github.com/user-attachments/assets/c80bbcdf-2de5-40d4-a7a2-e8ac7781023d" />

### Wallet Connection
<img width="1878" height="893" alt="image" src="https://github.com/user-attachments/assets/91bc9810-00ee-4968-b342-1e6b47e76228" />

### payment Send 
<img width="1880" height="900" alt="Screenshot 2026-03-06 155248" src="https://github.com/user-attachments/assets/0a16ef55-565b-46a7-9ad1-4acaa54b6bf1" />
<img width="1875" height="907" alt="Screenshot 2026-03-06 155312" src="https://github.com/user-attachments/assets/2b75678d-fa19-40cf-9cb2-570b8ea1d5a7" />


### NFT Minting
<img width="1919" height="910" alt="Screenshot 2026-03-06 155935" src="https://github.com/user-attachments/assets/697ae705-0ad6-422c-bfd6-cbfbf797f6b0" />

###  NFT Minting Success
<img width="1871" height="902" alt="image" src="https://github.com/user-attachments/assets/c0fd49a1-4171-43df-bfd3-94358abd434b" />

### Explorer Page
<img width="1876" height="896" alt="image" src="https://github.com/user-attachments/assets/b8789f17-d22c-4f69-87b8-203dca526166" />


### NFT Gallery
<img width="1867" height="891" alt="image" src="https://github.com/user-attachments/assets/a35c0b5a-5cea-4e46-b1e8-b26fdf6a7ff5" />

### marketplace pge
<img width="1870" height="888" alt="image" src="https://github.com/user-attachments/assets/782d0e73-f85b-4428-b752-3b99d2f6323f" />

### activity page
<img width="1872" height="908" alt="image" src="https://github.com/user-attachments/assets/2ea9acd0-8f5a-49b2-ba86-40ed79a21208" />


### Profile Page
<img width="1872" height="895" alt="image" src="https://github.com/user-attachments/assets/67366ba0-c627-471b-802d-54a344557a2e" />


### Test Output (3+ Tests Passing)
<img width="1702" height="972" alt="image" src="https://github.com/user-attachments/assets/eb23aad1-547b-4717-a9b6-2414c0833349" />

---

### How it works:
1. User calls `mint_nft` on NFT contract
2. NFT contract stores NFT data on-chain
3. NFT contract calls `token::transfer()` on SNFT contract ← **inter-contract call**
4. SNFT tokens automatically sent to minter
5. Event emitted for both contracts

---

## 🪙 Custom Token — SNFT

| Property | Value |
|----------|-------|
| Name | Stellar NFT Token |
| Symbol | SNFT |
| Decimals | 7 |
| Network | Stellar Testnet |
| Reward per Mint | 10 SNFT |
| Contract Type | Soroban |

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Tailwind CSS, Framer Motion |
| Blockchain | Stellar Testnet (Soroban) |
| NFT Contract | Rust + soroban-sdk v22 |
| Token Contract | Rust + soroban-sdk v22 (custom SNFT) |
| Storage | IPFS via Pinata |
| Wallets | Freighter, Albedo |
| SDK | @stellar/stellar-sdk |
| Deploy | Vercel |
| Testing | Jest (39 tests) |

---

## 📁 Project Structure

```
stellar-nft-dapp/
├── .github/
├── stellar-new/                # React Frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── MintPage.js
│   │   │   ├── GalleryPage.js
│   │   │   ├── MarketplacePage.js
│   │   │   ├── ActivityPage.js
│   │   │   ├── PaymentPage.js
│   │   │   └── TokenRewardPage.js  # ✅ NEW - SNFT rewards
│   │   └── tests/
│   │       └── contractUtils.test.js  # 39 tests
├── contract/                   # NFT Contract (Rust)
│   └── src/lib.rs              # mint_nft + inter-contract call
├── token_contract/             # SNFT Token Contract (Rust)
│   └── src/lib.rs              # Custom token
└── backend/
    └── server.js               # IPFS proxy
```

---

## ⚙️ Setup & Run

### 1. Clone & Install

```bash
git clone https://github.com/pratikshakalbhor/NFT_Based-dapp
cd stellar-nft-dapp/stellar-new
npm install
```

### 2. Environment Variables

```env
REACT_APP_CONTRACT_ID=CAY3O4WNR3H7T4ARQIXNPITJPHWY7ZRMINGQR2TQBHDQJXDEBR33OKFP
REACT_APP_NETWORK=TESTNET
```

### 3. Run

```bash
# Backend
cd backend && node server.js

# Frontend
cd stellar-new && npm start
```

### 4. Tests

```bash
npm test 
# 39 tests passing ✅
```

---

## 🌟 Features

| Feature | Level | Status |
|---------|-------|--------|
| Wallet Connect (Freighter/Albedo) | L1 | ✅ |
| Mint NFT via Soroban | L1 | ✅ |
| IPFS Storage | L2 | ✅ |
| Gallery + Search | L2 | ✅ |
| Marketplace (Buy/Sell) | L2 | ✅ |
| Activity Feed | L2 | ✅ |
| 39 Unit Tests | L3 | ✅ |
| README + Docs | L3 | ✅ |
---

## 🔗 Useful Links

- [Stellar Expert Explorer](https://stellar.expert/explorer/testnet)
- [Friendbot - Fund Account](https://friendbot.stellar.org)
- [Soroban Docs](https://soroban.stellar.org)
- [Pinata IPFS](https://pinata.cloud)
- [Freighter Wallet](https://freighter.app)

---



### Level 4

---
## 🔗 Smart Contract Details
## NFTREWARD Token Deployment Details

Token Name: NFTREWARD  
Network: Stellar Testnet  
Admin: pratiksha

Contract ID:  
CC727BIT26EWN3XINZBVCEUDZONAA34ABNUDCDW724DMSKPOBZ2H6LQZ  

Deployment Transaction Hash:  
d7475766ad63160b63ab396340d57c8402aa33721c26b22aff2d2099e3b4357  

Explorer Link:  
https://stellar.expert/explorer/testnet/tx/d7475766ad63160b63ab396340d57c8402aa33721c26b22aff2d2099e3b4357





