import { useState } from "react";

export const useContracts = () => {
  const [contracts] = useState<Record<string, unknown>[]>([]);
  return {
    data: { loadedContracts: {}, failed: {} },
    isLoading: false,
    contracts,
  };
};
