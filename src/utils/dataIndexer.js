/**
 * FreelanceChain Data Indexer
 * src/utils/dataIndexer.js
 * 
 * Indexes Stellar blockchain data into Firebase for fast queries.
 * Runs on-demand and auto-indexes every 5 minutes.
 */

import * as StellarSdk from "@stellar/stellar-sdk";
import { ref, set, get } from "firebase/database";
import { db } from "../firebase";
import { CONTRACT_ID, ESCROW_CONTRACT_ID, NETWORK_PASSPHRASE, SOROBAN_SERVER } from "../constants";

const HORIZON_URL = "https://horizon-testnet.stellar.org";
const INDEX_KEY = "indexed_data";

const sanitizeBigInt = (data) => {
  return JSON.parse(JSON.stringify(data, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
};

// ── Index all NFTs from blockchain → Firebase ─────────────────────────────
export const indexNFTs = async (walletAddress) => {
  if (!walletAddress) return;
  try {
    const dummy = new StellarSdk.Account(walletAddress, "0");

    // Get total NFTs
    const totalTx = new StellarSdk.TransactionBuilder(dummy, {
      fee: "100", networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(StellarSdk.Operation.invokeContractFunction({
        contract: CONTRACT_ID,
        function: "get_total",
        args: [],
      }))
      .setTimeout(30).build();

    const totalSim = await SOROBAN_SERVER.simulateTransaction(totalTx);
    if (!totalSim?.result?.retval) return;
    const total = Number(StellarSdk.scValToNative(totalSim.result.retval));

    // Fetch all NFTs in parallel
    const nftPromises = Array.from({ length: total }, (_, i) => {
      const id = i + 1;
      return (async () => {
        try {
          const [ownerSim, nameSim, imageSim] = await Promise.all([
            SOROBAN_SERVER.simulateTransaction(
              new StellarSdk.TransactionBuilder(dummy, { fee: "100", networkPassphrase: NETWORK_PASSPHRASE })
                .addOperation(StellarSdk.Operation.invokeContractFunction({
                  contract: CONTRACT_ID, function: "get_owner",
                  args: [StellarSdk.nativeToScVal(id, { type: "u32" })],
                })).setTimeout(30).build()
            ),
            SOROBAN_SERVER.simulateTransaction(
              new StellarSdk.TransactionBuilder(dummy, { fee: "100", networkPassphrase: NETWORK_PASSPHRASE })
                .addOperation(StellarSdk.Operation.invokeContractFunction({
                  contract: CONTRACT_ID, function: "get_name",
                  args: [StellarSdk.nativeToScVal(id, { type: "u32" })],
                })).setTimeout(30).build()
            ),
            SOROBAN_SERVER.simulateTransaction(
              new StellarSdk.TransactionBuilder(dummy, { fee: "100", networkPassphrase: NETWORK_PASSPHRASE })
                .addOperation(StellarSdk.Operation.invokeContractFunction({
                  contract: CONTRACT_ID, function: "get_image",
                  args: [StellarSdk.nativeToScVal(id, { type: "u32" })],
                })).setTimeout(30).build()
            ),
          ]);

          const owner = ownerSim?.result?.retval
            ? new StellarSdk.Address(StellarSdk.scValToNative(ownerSim.result.retval)).toString()
            : null;
          const name = nameSim?.result?.retval
            ? String(StellarSdk.scValToNative(nameSim.result.retval))
            : null;
          const image = imageSim?.result?.retval
            ? String(StellarSdk.scValToNative(imageSim.result.retval))
            : null;

          return { id, owner, name, image, indexedAt: Date.now() };
        } catch { return null; }
      })();
    });

    const nfts = (await Promise.all(nftPromises)).filter(Boolean);

    // Save to Firebase index
    const nftIndexRef = ref(db, `${INDEX_KEY}/nfts`);
    const nftMap = {};
    nfts.forEach(nft => { nftMap[`nft_${nft.id}`] = nft; });
    await set(nftIndexRef, {
      data: nftMap,
      total,
      lastIndexed: Date.now(),
    });

    console.log(`[Indexer] Indexed ${nfts.length} NFTs`);
    return nfts;
  } catch (e) {
    console.error("[Indexer] NFT indexing error:", e);
    return [];
  }
};

// ── Index all Jobs from escrow contract → Firebase ────────────────────────
export const indexJobs = async (walletAddress) => {
  if (!walletAddress) return;
  try {
    const dummy = new StellarSdk.Account(walletAddress, "0");

    const totalTx = new StellarSdk.TransactionBuilder(dummy, {
      fee: "100", networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(StellarSdk.Operation.invokeContractFunction({
        contract: ESCROW_CONTRACT_ID,
        function: "get_total",
        args: [],
      }))
      .setTimeout(30).build();

    const totalSim = await SOROBAN_SERVER.simulateTransaction(totalTx);
    if (!totalSim?.result?.retval) return;
    const total = Number(StellarSdk.scValToNative(totalSim.result.retval));

    // Fetch all jobs in parallel
    const jobPromises = Array.from({ length: total }, (_, i) => {
      const id = i + 1;
      return (async () => {
        try {
          const jobTx = new StellarSdk.TransactionBuilder(dummy, {
            fee: "100", networkPassphrase: NETWORK_PASSPHRASE,
          })
            .addOperation(StellarSdk.Operation.invokeContractFunction({
              contract: ESCROW_CONTRACT_ID,
              function: "get_job",
              args: [StellarSdk.nativeToScVal(id, { type: "u32" })],
            }))
            .setTimeout(30).build();

          const sim = await SOROBAN_SERVER.simulateTransaction(jobTx);
          if (sim?.result?.retval) {
            const rawJob = StellarSdk.scValToNative(sim.result.retval);
            const job = sanitizeBigInt(rawJob);
            return { ...job, id, indexedAt: Date.now() };
          }
          return null;
        } catch { return null; }
      })();
    });

    const jobs = (await Promise.all(jobPromises)).filter(Boolean);

    // Save to Firebase index
    const jobIndexRef = ref(db, `${INDEX_KEY}/jobs`);
    const jobMap = {};
    jobs.forEach(job => { jobMap[`job_${job.id}`] = job; });
    await set(jobIndexRef, {
      data: jobMap,
      total,
      lastIndexed: Date.now(),
    });

    console.log(`[Indexer] Indexed ${jobs.length} Jobs`);
    return jobs;
  } catch (e) {
    console.error("[Indexer] Job indexing error:", e);
    return [];
  }
};

// ── Index recent transactions from Horizon ────────────────────────────────
export const indexTransactions = async (walletAddress) => {
  if (!walletAddress) return;
  try {
    const horizonServer = new StellarSdk.Horizon.Server(HORIZON_URL);

    const txResponse = await horizonServer.transactions()
      .forAccount(walletAddress)
      .order("desc")
      .limit(50)
      .call();

    const txs = (txResponse.records || []).map(tx => ({
      hash: tx.hash,
      createdAt: tx.created_at,
      successful: tx.successful,
      operationCount: tx.operation_count,
      feeCharged: tx.fee_charged,
      indexedAt: Date.now(),
    }));

    const txIndexRef = ref(db, `${INDEX_KEY}/transactions/${walletAddress.slice(0, 8)}`);
    await set(txIndexRef, {
      data: txs,
      lastIndexed: Date.now(),
    });

    console.log(`[Indexer] Indexed ${txs.length} transactions`);
    return txs;
  } catch (e) {
    console.error("[Indexer] TX indexing error:", e);
    return [];
  }
};

// ── Read from index (fast!) ───────────────────────────────────────────────
export const readIndexedNFTs = async () => {
  try {
    const snap = await get(ref(db, `${INDEX_KEY}/nfts`));
    if (!snap.exists()) return null;
    const data = snap.val();
    return {
      nfts: Object.values(data.data || {}),
      total: data.total,
      lastIndexed: data.lastIndexed,
    };
  } catch { return null; }
};

export const readIndexedJobs = async () => {
  try {
    const snap = await get(ref(db, `${INDEX_KEY}/jobs`));
    if (!snap.exists()) return null;
    const data = snap.val();
    return {
      jobs: Object.values(data.data || {}),
      total: data.total,
      lastIndexed: data.lastIndexed,
    };
  } catch { return null; }
};

// ── Full index run ────────────────────────────────────────────────────────
export const runFullIndex = async (walletAddress) => {
  console.log("[Indexer] Starting full index...");
  const [nfts, jobs, txs] = await Promise.all([
    indexNFTs(walletAddress),
    indexJobs(walletAddress),
    indexTransactions(walletAddress),
  ]);
  console.log("[Indexer] Full index complete:", { nfts: nfts?.length, jobs: jobs?.length, txs: txs?.length });
  return { nfts, jobs, txs };
};

// ── Check if index is stale (older than 5 mins) ───────────────────────────
export const isIndexStale = async () => {
  try {
    const snap = await get(ref(db, `${INDEX_KEY}/nfts/lastIndexed`));
    if (!snap.exists()) return true;
    const lastIndexed = snap.val();
    const fiveMinutes = 5 * 60 * 1000;
    return Date.now() - lastIndexed > fiveMinutes;
  } catch { return true; }
};