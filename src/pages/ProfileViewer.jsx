import React, { useState, useEffect, useCallback } from 'react';
import { useWallet } from '../WalletContext';
import './ProfileViewer.css';
import {
    TransactionBuilder,
    Operation,
    SorobanRpc,
    scValToNative,
    xdr,
} from 'soroban-client';
import { HORIZON_URL, RPC_URL, CONTRACT_ID } from '../constants';
import { shortenAddress } from '../utils';

const StatItem = ({ label, value, loading }) => (
    <div className="stat-item">
        <span className="stat-label">{label}</span>
        <span className="stat-value">{loading ? '...' : value}</span>
    </div>
);

const ProfileViewer = () => {
    const { walletAddress } = useWallet();
    const [copied, setCopied] = useState(false);
    const [totalTransactions, setTotalTransactions] = useState(0);
    const [nftCount, setNftCount] = useState(0);
    const [accountCreated, setAccountCreated] = useState('Loading...');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchOwnedNftCount = useCallback(async (ownerAddress) => {
        if (!CONTRACT_ID.startsWith('C')) {
            console.warn("NFT count fetch skipped: Please replace 'YOUR_CONTRACT_ID_HERE' with your actual contract ID.");
            return 0;
        }
        const server = new SorobanRpc.Server(RPC_URL, { allowHttp: true });
        const source = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

        const simulateCall = async (method, ...scvArgs) => {
            const contractAddress = xdr.ScAddress.scAddressTypeContract(Buffer.from(CONTRACT_ID.slice(1), 'hex'));
            const tx = new TransactionBuilder(source, { fee: '10000' })
                .addOperation(Operation.invokeHostFunction({
                    func: xdr.HostFunction.hostFunctionTypeInvokeContract(new xdr.InvokeContractArgs({
                        contractAddress,
                        functionName: method,
                        args: scvArgs,
                    })),
                    auth: [],
                }))
                .setTimeout(30)
                .build();
            try {
                const { result } = await server.simulateTransaction(tx);
                if (result?.retval) return scValToNative(result.retval);
            } catch (e) {
                console.error(`Error simulating ${method} call:`, e);
            }
            return null;
        };

        try {
            const total = await simulateCall('get_total');
            if (total === null || total === 0) return 0;
            let ownedCount = 0;
            for (let i = 1; i <= total; i++) {
                const owner = await simulateCall('get_owner', xdr.ScVal.scvU32(i));
                if (owner === ownerAddress) ownedCount++;
            }
            return ownedCount;
        } catch (e) {
            console.error("Error fetching owned NFT count:", e);
            setError(prev => (prev ? prev + ' ' : '') + 'Could not load NFT count.');
            return 0;
        }
    }, []);

    const fetchAllData = useCallback(async (address) => {
        setLoading(true);
        setError('');

        try {
            // As per requirements, we fetch:
            // 1. The first transaction to determine the account creation date.
            // 2. A list of transactions to count them (up to the page limit).
            // 3. The user's NFT count from the smart contract.
            const [firstTxRes, allTxsRes, nftCountRes] = await Promise.all([
                fetch(`${HORIZON_URL}/accounts/${address}/transactions?order=asc&limit=1`).catch(() => null),
                fetch(`${HORIZON_URL}/accounts/${address}/transactions?limit=200`).catch(() => null), // Note: This is not a total count if > 200 txs.
                fetchOwnedNftCount(address)
            ]);

            // Process account creation date from the first transaction
            if (firstTxRes && firstTxRes.ok) {
                const data = await firstTxRes.json();
                if (data._embedded?.records?.length > 0) {
                    const creationDate = data._embedded.records[0].created_at;
                    setAccountCreated(new Date(creationDate).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'long', day: 'numeric',
                    }));
                } else {
                    // If the request is successful but there are no records, the account is funded but has no transactions.
                    setAccountCreated('N/A (No transactions)');
                }
            } else if (firstTxRes && firstTxRes.status === 404) {
                // A 404 on this endpoint means the account doesn't exist on the ledger.
                setAccountCreated('N/A (Unfunded)');
            } else {
                // Handle other potential network or server errors for this specific fetch.
                setAccountCreated('N/A');
                setError(prev => (prev ? prev + ' ' : '') + 'Could not load creation date.');
            }

            // Process transaction count
            if (allTxsRes && allTxsRes.ok) {
                const txData = await allTxsRes.json();
                // This count is limited by the page size (200 here). For a true total, pagination would be needed.
                // This implements the user's request to use `records.length`.
                setTotalTransactions(txData._embedded?.records?.length || 0);
            } else {
                setTotalTransactions(0);
            }

            // Set NFT count
            setNftCount(nftCountRes);

        } catch (e) {
            console.error("Error fetching account data:", e);
            setError('Could not load account data.');
        } finally {
            setLoading(false);
        }
    }, [fetchOwnedNftCount]);

    useEffect(() => {
        if (walletAddress) {
            fetchAllData(walletAddress);
        } else {
            // Reset state and stop loading if wallet disconnects
            setLoading(false);
            setTotalTransactions(0);
            setNftCount(0);
            setAccountCreated('Loading...');
            setError('');
        }
    }, [walletAddress, fetchAllData]);

    const handleCopy = () => {
        if (!walletAddress) return;
        navigator.clipboard.writeText(walletAddress);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Generate deterministic gradient and initials from address
    const getAvatarData = (addr) => {
        if (!addr) return { initials: '??', gradient: 'linear-gradient(135deg, #333, #555)' };

        const cleanAddr = addr.replace(/[^a-zA-Z0-9]/g, '');
        const char1 = cleanAddr.charAt(0).toUpperCase();
        const char2 = cleanAddr.charAt(1).toUpperCase();

        let hash = 0;
        for (let i = 0; i < addr.length; i++) {
            hash = addr.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue1 = Math.abs(hash % 360);
        const hue2 = (hue1 + 40) % 360;

        return {
            initials: `${char1}${char2}`,
            gradient: `linear-gradient(135deg, hsl(${hue1}, 70%, 60%), hsl(${hue2}, 70%, 60%))`
        };
    };

    const { initials, gradient } = getAvatarData(walletAddress);
    const explorerUrl = walletAddress ? `https://stellar.expert/explorer/testnet/account/${walletAddress}` : '#';

    return (
        <div className="profile-viewer-container fade-in">
            <div className="profile-card">
                {error && <p style={{ color: '#ef4444', textAlign: 'center', width: '100%' }}>{error}</p>}
                <div className="profile-header">
                    <div className="profile-avatar" style={{ background: gradient }}>
                        <span className="avatar-initials">{initials}</span>
                    </div>

                    <div className="profile-info">
                        <h2 className="profile-short-address" title={walletAddress}>
                            {walletAddress ? shortenAddress(walletAddress) : 'No Wallet Connected'}
                        </h2>
                        <div className="address-row">
                            <span className="full-address" title={walletAddress}>
                                {walletAddress || 'Please connect a wallet to see your profile.'}
                            </span>
                            {walletAddress && (
                                <button
                                    className={`copy-btn ${copied ? 'copied' : ''}`}
                                    onClick={handleCopy}
                                    title="Copy Address"
                                >
                                    {copied ? (
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                    ) : (
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                        </svg>
                                    )}
                                </button>
                            )}
                        </div>

                        {walletAddress && (
                            <div className="profile-actions">
                                <a
                                    href={explorerUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="external-link-btn"
                                >
                                    View on Stellar Expert
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                        <polyline points="15 3 21 3 21 9"></polyline>
                                        <line x1="10" y1="14" x2="21" y2="3"></line>
                                    </svg>
                                </a>
                            </div>
                        )}
                    </div>
                </div>

                <div className="profile-stats">
                    <StatItem label="Account Created" value={accountCreated} loading={loading && !!walletAddress} />
                    <StatItem label="Total Transactions" value={totalTransactions} loading={loading && !!walletAddress} />
                    <StatItem label="NFTs Owned" value={nftCount} loading={loading && !!walletAddress} />
                </div>
            </div>
        </div>
    );
};

export default ProfileViewer;
