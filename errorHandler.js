export const getFriendlyErrorMessage = (error) => {
  console.error("Stellar Operation Error:", error);

  if (!error) return "An unknown error occurred.";

  // Convert error to string to check for keywords
  const msg = (error.message || error.toString()).toLowerCase();

  // Common Stellar / Wallet errors
  if (msg.includes("user declined") || msg.includes("rejected")) {
    return "Transaction rejected by user.";
  }
  if (msg.includes("network error") || msg.includes("failed to fetch")) {
    return "Network error. Unable to reach the Stellar network.";
  }
  if (msg.includes("op_low_reserve") || msg.includes("insufficient balance")) {
    return "Insufficient balance to complete the transaction.";
  }
  if (msg.includes("tx_bad_seq")) {
    return "Transaction sequence error. Please refresh the page and try again.";
  }
  if (msg.includes("timeout")) {
    return "Transaction timed out. Please check the explorer to see if it went through.";
  }

  // Fallback
  return "Transaction failed. Please try again.";
};