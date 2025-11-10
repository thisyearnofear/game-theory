import { useState, useEffect, useCallback } from "react";
import { getXLMBalance } from "../util/wallet";

export const useBalance = (address?: string, pollIntervalMs = 5000) => {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!address) {
      setBalance(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const xlmBalance = await getXLMBalance(address);
      setBalance(xlmBalance);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setBalance(null);
    } finally {
      setLoading(false);
    }
  }, [address]);

  // Initial fetch
  useEffect(() => {
    void fetchBalance();
  }, [address, fetchBalance]);

  // Polling for balance updates
  useEffect(() => {
    if (!address) return;

    const interval = setInterval(() => void fetchBalance(), pollIntervalMs);
    return () => clearInterval(interval);
  }, [address, pollIntervalMs, fetchBalance]);

  const refresh = useCallback(() => {
    void fetchBalance();
  }, [fetchBalance]);

  return {
    balance,
    loading,
    error,
    refresh,
    isSufficientBalance: (amount: number) =>
      balance !== null && balance >= amount,
  };
};
