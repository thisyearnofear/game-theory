import type {
  Transaction,
  FeeBumpTransaction,
} from "@stellar/stellar-sdk";
import { Account } from "@stellar/stellar-sdk";

const horizonUrl = "https://horizon-testnet.stellar.org";

export interface TransactionOptions {
  networkPassphrase: string;
  publicKey: string;
  timeout?: number;
}

/**
 * Fetch account details from Horizon for transaction building
 */
export const getAccountSequence = async (
  publicKey: string
): Promise<Account> => {
  const response = await fetch(`${horizonUrl}/accounts/${publicKey}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch account: ${response.statusText}`);
  }
  const accountData = (await response.json()) as { sequence: string };
  return new Account(publicKey, accountData.sequence);
};

/**
 * Submit a signed transaction to Horizon
 */
export const submitTransaction = async (
  transaction: Transaction | FeeBumpTransaction
): Promise<{ id: string; hash: string }> => {
  const response = await fetch(`${horizonUrl}/transactions`, {
    method: "POST",
    body: new URLSearchParams({
      tx: transaction.toXDR(),
    }),
  });

  if (!response.ok) {
    const error = (await response.json()) as { title: string; detail: string };
    throw new Error(
      `Transaction submission failed: ${error.title} - ${error.detail}`
    );
  }

  const result = (await response.json()) as { id: string; hash: string };
  return {
    id: result.id,
    hash: result.hash,
  };
};

interface TransactionResponse {
  id: string;
  hash: string;
  [key: string]: unknown;
}

/**
 * Poll for transaction confirmation
 */
export const waitForTransaction = async (
  transactionHash: string,
  maxAttempts: number = 30,
  delayMs: number = 1000
): Promise<TransactionResponse> => {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(
        `${horizonUrl}/transactions/${transactionHash}`
      );
      if (response.ok) {
        return (await response.json()) as TransactionResponse;
      }
    } catch {
      // Transaction not yet in ledger
    }

    if (i < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw new Error("Transaction confirmation timeout");
};

/**
 * Get stellar expert link for a transaction
 */
export const getStellarExpertLink = (
  txHash: string,
  network: "testnet" | "public" = "testnet"
): string => {
  const baseUrl = `https://stellar.expert/explorer/${network}`;
  return `${baseUrl}/tx/${txHash}`;
};

/**
 * Get stellar expert link for a contract
 */
export const getContractLink = (
  contractId: string,
  network: "testnet" | "public" = "testnet"
): string => {
  const baseUrl = `https://stellar.expert/explorer/${network}`;
  return `${baseUrl}/contract/${contractId}`;
};
