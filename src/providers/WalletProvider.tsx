import {
  createContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { wallet, connectWallet, disconnectWallet } from "../util/wallet";
import storage from "../util/storage";

export interface WalletContextType {
  address?: string;
  network?: string;
  networkPassphrase?: string;
  isPending: boolean;
  signTransaction?: typeof wallet.signTransaction;
  connect?: () => void;
  disconnect?: () => void;
}

const initialState = {
  address: undefined,
  network: undefined,
  networkPassphrase: undefined,
};

const POLL_INTERVAL = 5000;

export const WalletContext = createContext<WalletContextType>({
  isPending: true,
});

export const WalletProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] =
    useState<Omit<WalletContextType, "isPending">>(initialState);
  const [isPending, startTransition] = useTransition();
  const popupLock = useRef(false);
  const signTransaction = wallet.signTransaction.bind(wallet);

  const nullify = () => {
    updateState(initialState);
    storage.setItem("walletId", "");
    storage.setItem("walletAddress", "");
    storage.setItem("walletNetwork", "");
    storage.setItem("networkPassphrase", "");
  };

  const updateState = (newState: Omit<WalletContextType, "isPending">) => {
    setState((prev: Omit<WalletContextType, "isPending">) => {
      if (
        prev.address !== newState.address ||
        prev.network !== newState.network ||
        prev.networkPassphrase !== newState.networkPassphrase
      ) {
        return newState;
      }
      return prev;
    });
  };

  const updateCurrentWalletState = async () => {
    // There is no way, with StellarWalletsKit, to check if the wallet is
    // installed/connected/authorized. We need to manage that on our side by
    // checking our storage item.
    const walletId = storage.getItem("walletId");
    const walletNetwork = storage.getItem("walletNetwork");
    const walletAddr = storage.getItem("walletAddress");
    const passphrase = storage.getItem("networkPassphrase");

    if (
      !state.address &&
      walletAddr !== null &&
      walletNetwork !== null &&
      passphrase !== null
    ) {
      updateState({
        address: walletAddr,
        network: walletNetwork,
        networkPassphrase: passphrase,
      });
    }

    if (!walletId) {
      nullify();
    } else {
      if (popupLock.current) return;
      // If our storage item is there, then we try to get the user's address &
      // network from their wallet. Note: `getAddress` MAY open their wallet
      // extension, depending on which wallet they select!
      try {
        popupLock.current = true;
        // Skip re-polling for non-freighter wallets when we already have address
        if (walletId !== "freighter" && walletAddr !== null) return;
        const [addressResult, networkResult] = await Promise.all([
          wallet.getAddress(),
          wallet.getNetwork(),
        ]);

        const address = addressResult;
        if (!address) storage.setItem("walletId", "");
        if (
          address !== state.address ||
          networkResult.network !== state.network ||
          networkResult.networkPassphrase !== state.networkPassphrase
        ) {
          storage.setItem("walletAddress", address);
          updateState({
            address,
            network: networkResult.network,
            networkPassphrase: networkResult.networkPassphrase,
          });
        }
      } catch (e) {
        // If `getNetwork` or `getAddress` throw errors... sign the user out???
        nullify();
        // then log the error (instead of throwing) so we have visibility
        // into the error while working on Scaffold Stellar but we do not
        // crash the app process
        console.error(e);
      } finally {
        popupLock.current = false;
      }
    }
  };

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let isMounted = true;

    // Poll wallet state to detect disconnections or network changes.
    // Only calls getAddress/getNetwork for freighter wallets (which support
    // silent polling). Non-freighter wallets use stored values after initial
    // connect to avoid triggering extension popups.
    const pollWalletState = async () => {
      if (!isMounted) return;

      await updateCurrentWalletState();

      if (isMounted) {
        timer = setTimeout(() => void pollWalletState(), POLL_INTERVAL);
      }
    };

    // Get the wallet address when the component is mounted for the first time
    startTransition(async () => {
      await updateCurrentWalletState();

      if (isMounted) {
        timer = setTimeout(() => void pollWalletState(), POLL_INTERVAL);
      }
    });

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally run once on mount
  }, []);

  const connect = () => {
    startTransition(async () => {
      try {
        const result = await connectWallet();
        const { address, network, networkPassphrase } = result as {
          address: string;
          network: string;
          networkPassphrase: string;
        };
        updateState({ address, network, networkPassphrase });
        storage.setItem("walletId", "freighter");
        storage.setItem("walletAddress", address);
        storage.setItem("walletNetwork", network);
        storage.setItem("networkPassphrase", networkPassphrase);
      } catch (error) {
        console.error("Failed to connect wallet:", error);
        nullify();
      }
    });
  };

  const disconnect = () => {
    startTransition(() => {
      disconnectWallet();
      nullify();
    });
  };

  const contextValue = useMemo(
    () => ({
      ...state,
      isPending,
      signTransaction,
      connect,
      disconnect,
    }),
    [state, isPending, signTransaction],
  );

  return <WalletContext value={contextValue}>{children}</WalletContext>;
};
