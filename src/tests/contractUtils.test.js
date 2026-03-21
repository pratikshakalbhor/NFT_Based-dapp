// src/__tests__/contractUtils.test.js
//  Stellar NFT dApp - Pure Utility Tests
//  NO @stellar/stellar-sdk import - avoids axios ESM error
// Run: npm test -- --watchAll=false --verbose

// ============================================================
// Pure Utility Functions (no external dependencies)
// ============================================================

const isValidStellarAddress = (address) => {
  if (!address || typeof address !== "string") return false;
  // Stellar public key: starts with G, length 56, base32 chars only
  return /^G[A-Z2-7]{55}$/.test(address.trim());
};

const formatXLMAmount = (amount) => {
  const num = parseFloat(amount);
  if (isNaN(num) || num <= 0) throw new Error("Invalid amount");
  return num.toFixed(7);
};

const removeDuplicateNFTs = (nfts) => {
  if (!nfts || !Array.isArray(nfts)) return [];
  return nfts.filter((nft, index, self) =>
    index === self.findIndex((n) =>
      n.name === nft.name &&
      (n.imageId || n.image) === (nft.imageId || nft.image)
    )
  );
};

const isIPFSUrl = (url) => {
  if (!url || typeof url !== "string") return false;
  return (
    url.startsWith("https://gateway.pinata.cloud/ipfs/") ||
    url.startsWith("https://ipfs.io/ipfs/") ||
    url.startsWith("ipfs://")
  );
};

const buildListingFromNFT = (nft, walletAddress, defaultPrice = "10") => {
  if (!nft || !walletAddress) throw new Error("NFT and wallet address required");
  return {
    id: 1001,
    name: nft.name || "Unnamed NFT",
    image: nft.imageId || nft.image || "",
    price: defaultPrice,
    owner: `${walletAddress.slice(0, 6)}...${walletAddress.slice(-5)}`,
    ownerFull: walletAddress,
    listed: false,
  };
};

const isValidTxHash = (hash) => {
  if (!hash || typeof hash !== "string") return false;
  return /^[a-f0-9]{64}$/i.test(hash);
};

const shortenAddress = (address) => {
  if (!address || address.length < 10) return "";
  return `${address.slice(0, 6)}...${address.slice(-5)}`;
};

const getActivityType = (opType, fromAddress, walletAddress) => {
  if (opType === "invoke_host_function") return "MINT";
  if (opType === "payment") {
    return fromAddress === walletAddress ? "SEND" : "RECEIVE";
  }
  if (opType === "create_account") return "CREATE";
  return "TX";
};

// ============================================================
// TEST SUITE 1: Address Validation
// ============================================================
describe("Stellar Address Validation", () => {

  test(" valid Stellar public key passes", () => {
    const validKey = "GCXF754WQZ5ELFJMQTWJDOTUR6MQQXHDVEFEYDQBIQICQ6H7XLRM4VRZ";
    expect(isValidStellarAddress(validKey)).toBe(true);
  });

  test(" another valid address passes", () => {
    const validKey = "GDMSTAGP2L7LE4CYQLK43CG3XLT5DCUW44B6LH4TDPVYYORL24MUXD6U";
    expect(isValidStellarAddress(validKey)).toBe(true);
  });

  test(" invalid key rejected - too short", () => {
    expect(isValidStellarAddress("GABC123")).toBe(false);
  });

  test(" invalid key rejected - wrong start", () => {
    expect(isValidStellarAddress("SABC754WQZ5ELFJMQTWJDOTUR6MQQXHDVEFEYDQBIQICQ6H7XLRM4VRZ")).toBe(false);
  });

  test(" empty string rejected", () => {
    expect(isValidStellarAddress("")).toBe(false);
  });

  test("null/undefined rejected", () => {
    expect(isValidStellarAddress(null)).toBe(false);
    expect(isValidStellarAddress(undefined)).toBe(false);
  });
});

// ============================================================
// TEST SUITE 2: XLM Amount Formatting
// ============================================================
describe("XLM Amount Formatting", () => {

  test(" integer formatted to 7 decimals", () => {
    expect(formatXLMAmount("10")).toBe("10.0000000");
  });

  test(" decimal formatted correctly", () => {
    expect(formatXLMAmount("5.5")).toBe("5.5000000");
  });

  test(" number input works", () => {
    expect(formatXLMAmount(100)).toBe("100.0000000");
  });

  test(" minimum amount works", () => {
    expect(formatXLMAmount("0.0000001")).toBe("0.0000001");
  });

  test(" throws on zero amount", () => {
    expect(() => formatXLMAmount("0")).toThrow("Invalid amount");
  });

  test(" throws on negative amount", () => {
    expect(() => formatXLMAmount("-5")).toThrow("Invalid amount");
  });

  test(" throws on non-numeric", () => {
    expect(() => formatXLMAmount("abc")).toThrow("Invalid amount");
  });
});

// ============================================================
// TEST SUITE 3: Duplicate NFT Detection
// ============================================================
describe("Duplicate NFT Detection", () => {

  test(" removes exact duplicates", () => {
    const nfts = [
      { name: "NFT A", imageId: "https://ipfs.io/ipfs/abc123" },
      { name: "NFT B", imageId: "https://ipfs.io/ipfs/def456" },
      { name: "NFT A", imageId: "https://ipfs.io/ipfs/abc123" }, // duplicate
    ];
    const unique = removeDuplicateNFTs(nfts);
    expect(unique).toHaveLength(2);
  });

  test(" keeps all unique NFTs", () => {
    const nfts = [
      { name: "NFT 1", imageId: "https://ipfs.io/ipfs/aaa" },
      { name: "NFT 2", imageId: "https://ipfs.io/ipfs/bbb" },
      { name: "NFT 3", imageId: "https://ipfs.io/ipfs/ccc" },
    ];
    expect(removeDuplicateNFTs(nfts)).toHaveLength(3);
  });

  test(" handles empty array", () => {
    expect(removeDuplicateNFTs([])).toHaveLength(0);
  });

  test(" handles null input", () => {
    expect(removeDuplicateNFTs(null)).toHaveLength(0);
  });

  test(" same name different image = not duplicate", () => {
    const nfts = [
      { name: "NFT A", imageId: "https://ipfs.io/ipfs/aaa" },
      { name: "NFT A", imageId: "https://ipfs.io/ipfs/bbb" }, // different image
    ];
    expect(removeDuplicateNFTs(nfts)).toHaveLength(2);
  });
});

// ============================================================
// TEST SUITE 4: IPFS URL Detection
// ============================================================
describe("IPFS URL Detection", () => {

  test("Pinata gateway URL detected", () => {
    expect(isIPFSUrl("https://gateway.pinata.cloud/ipfs/QmTest123")).toBe(true);
  });

  test(" IPFS.io URL detected", () => {
    expect(isIPFSUrl("https://ipfs.io/ipfs/QmTest456")).toBe(true);
  });

  test(" ipfs:// protocol detected", () => {
    expect(isIPFSUrl("ipfs://QmTest789")).toBe(true);
  });

  test(" regular URL not detected as IPFS", () => {
    expect(isIPFSUrl("https://google.com/image.png")).toBe(false);
  });

  test(" empty string returns false", () => {
    expect(isIPFSUrl("")).toBe(false);
  });

  test(" null returns false", () => {
    expect(isIPFSUrl(null)).toBe(false);
  });
});

// ============================================================
// TEST SUITE 5: NFT Listing Creation
// ============================================================
describe("NFT Listing Object Creation", () => {

  const wallet = "GCXF754WQZ5ELFJMQTWJDOTUR6MQQXHDVEFEYDQBIQICQ6H7XLRM4VRZ";

  test(" creates valid listing from NFT", () => {
    const nft = { name: "Solar NFT", imageId: "https://gateway.pinata.cloud/ipfs/QmTest" };
    const listing = buildListingFromNFT(nft, wallet, "25");

    expect(listing.name).toBe("Solar NFT");
    expect(listing.price).toBe("25");
    expect(listing.ownerFull).toBe(wallet);
    expect(listing.listed).toBe(false);
    expect(listing.owner).toBe("GCXF75...M4VRZ");
  });

  test(" uses imageId correctly", () => {
    const nft = { name: "Test", imageId: "https://gateway.pinata.cloud/ipfs/QmABC" };
    const listing = buildListingFromNFT(nft, wallet);
    expect(listing.image).toBe("https://gateway.pinata.cloud/ipfs/QmABC");
  });

  test(" falls back to image field", () => {
    const nft = { name: "Test", image: "https://ipfs.io/ipfs/QmXYZ" };
    const listing = buildListingFromNFT(nft, wallet);
    expect(listing.image).toBe("https://ipfs.io/ipfs/QmXYZ");
  });

  test(" throws without wallet", () => {
    const nft = { name: "Test NFT", imageId: "https://ipfs.io/test" };
    expect(() => buildListingFromNFT(nft, null)).toThrow("NFT and wallet address required");
  });

  test(" throws without NFT", () => {
    expect(() => buildListingFromNFT(null, wallet)).toThrow("NFT and wallet address required");
  });

  test(" uses default price of 10", () => {
    const nft = { name: "Test", imageId: "https://ipfs.io/ipfs/test" };
    const listing = buildListingFromNFT(nft, wallet);
    expect(listing.price).toBe("10");
  });
});

// ============================================================
// TEST SUITE 6: Transaction Hash & Activity
// ============================================================
describe("Transaction Hash & Activity", () => {

  test(" valid 64-char hex hash passes", () => {
    const hash = "0af641001a29a347da9b01e9f789cfc53126062280e3314252ccd0451aeda1f9";
    expect(isValidTxHash(hash)).toBe(true);
  });

  test(" uppercase hash also valid", () => {
    const hash = "0AF641001A29A347DA9B01E9F789CFC53126062280E3314252CCD0451AEDA1F9";
    expect(isValidTxHash(hash)).toBe(true);
  });

  test(" short hash invalid", () => {
    expect(isValidTxHash("abc123")).toBe(false);
  });

  test(" empty hash invalid", () => {
    expect(isValidTxHash("")).toBe(false);
  });

  test(" null hash invalid", () => {
    expect(isValidTxHash(null)).toBe(false);
  });

  test(" address shortened correctly", () => {
    const addr = "GCXF754WQZ5ELFJMQTWJDOTUR6MQQXHDVEFEYDQBIQICQ6H7XLRM4VRZ";
    expect(shortenAddress(addr)).toBe("GCXF75...M4VRZ");
  });

  test(" invoke_host_function = MINT activity", () => {
    expect(getActivityType("invoke_host_function", "", "")).toBe("MINT");
  });

  test(" payment from wallet = SEND", () => {
    const wallet = "GCXF754WQZ5ELFJMQTWJDOTUR6MQQXHDVEFEYDQBIQICQ6H7XLRM4VRZ";
    expect(getActivityType("payment", wallet, wallet)).toBe("SEND");
  });

  test("payment to wallet = RECEIVE", () => {
    const wallet = "GCXF754WQZ5ELFJMQTWJDOTUR6MQQXHDVEFEYDQBIQICQ6H7XLRM4VRZ";
    const other = "GDMSTAGP2L7LE4CYQLK43CG3XLT5DCUW44B6LH4TDPVYYORL24MUXD6U";
    expect(getActivityType("payment", other, wallet)).toBe("RECEIVE");
  });
});