import {
  StellarWalletsKit,
  WalletNetwork,
  FreighterModule,
  FREIGHTER_ID,
  ISupportedWallet,
} from "@creit.tech/stellar-wallets-kit";
import {
  Transaction,
  FeeBumpTransaction,
} from "@stellar/stellar-sdk";

export interface Balance {
  asset_type: string;
  balance: string;
}

interface WalletState {
  kit: StellarWalletsKit | null;
  address: string | null;
  network: string | null;
  networkPassphrase: string | null;
}

const state: WalletState = {
  kit: null,
  address: null,
  network: null,
  networkPassphrase: null,
};

// Initialize kit with Freighter as default (required by kit, but won't be used until user selects)
const initializeKit = () => {
  if (!state.kit) {
    try {
      state.kit = new StellarWalletsKit({
        network: WalletNetwork.TESTNET,
        modules: [new FreighterModule()],
        selectedWalletId: FREIGHTER_ID, // Kit requires this, but we override in connect flow
      });
    } catch (error) {
      console.error("Error initializing wallet kit:", error);
      state.kit = null;
      throw new Error(`Failed to initialize wallet kit. Is your wallet extension installed? ${String(error)}`);
    }
  }
  return state.kit;
};

export const wallet = {
  isConnected: () => !!state.address,

  getAddress: async () => {
    try {
      const kit = initializeKit();
      const { address } = await kit.getAddress();
      state.address = address;
      return address;
    } catch (error) {
      console.error("Error getting address:", error);
      throw error;
    }
  },

  getNetwork: async () => {
    try {
      const kit = initializeKit();
      const network = await kit.getNetwork();
      state.network = network.network;
      state.networkPassphrase = network.networkPassphrase;
      return {
        network: network.network,
        networkPassphrase: network.networkPassphrase,
      };
    } catch (error) {
      console.error("Error getting network:", error);
      throw error;
    }
  },

  signTransaction: async (
    transaction: Transaction | FeeBumpTransaction | string
  ): Promise<{ signedTxXdr: string }> => {
    try {
      const kit = initializeKit();
      if (!state.address) throw new Error("No address connected");
      
      // Handle both Transaction objects and XDR strings
      const transactionXdr = typeof transaction === 'string' 
        ? transaction 
        : transaction.toXDR();
      
      const result = await kit.signTransaction(transactionXdr, {
        networkPassphrase: state.networkPassphrase || "Test SDF Network ; September 2015",
        address: state.address,
      });
      return result;
    } catch (error) {
      console.error("Error signing transaction:", error);
      throw error;
    }
  },
};

export const connectWallet = async () => {
  return new Promise((resolve, reject) => {
    try {
      const kit = initializeKit();
      
      // Show modal and let user select wallet
      kit.openModal({
        onWalletSelected: async (option: ISupportedWallet) => {
          try {
            // Set the selected wallet in the kit
            await kit.setWallet(option.id);
            
            // Get address and network info
            const [{ address }, network] = await Promise.all([
              kit.getAddress(),
              kit.getNetwork(),
            ]);
            
            // Update internal state
            state.address = address;
            state.network = network.network;
            state.networkPassphrase = network.networkPassphrase;

            resolve({
              address,
              network: network.network,
              networkPassphrase: network.networkPassphrase,
            });
          } catch (error) {
            console.error("Error in wallet selection:", error);
            reject(error);
          }
        },
        onClosed: (error?: Error) => {
          if (error) {
            console.error("Modal closed with error:", error);
            reject(error);
          }
        },
      });
    } catch (error) {
      console.error("Error connecting wallet:", error);
      reject(error);
    }
  });
};

export const disconnectWallet = () => {
  state.address = null;
  state.network = null;
  state.networkPassphrase = null;
  state.kit = null;
};

export const fetchBalance = async (address: string): Promise<Balance[]> => {
  try {
    const horizonUrl = "https://horizon-testnet.stellar.org";
    const response = await fetch(`${horizonUrl}/accounts/${address}`);
    if (!response.ok) {
      throw new Error("Failed to fetch balance");
    }
    const data = (await response.json()) as { balances: Balance[] };
    return data.balances;
  } catch (error) {
    console.error("Error fetching balance:", error);
    throw error;
  }
};

export const getXLMBalance = async (address: string): Promise<number> => {
  try {
    const balances = await fetchBalance(address);
    const xlmBalance = balances.find((b) => b.asset_type === "native");
    return xlmBalance ? parseFloat(xlmBalance.balance) : 0;
  } catch (error) {
    console.error("Error getting XLM balance:", error);
    return 0;
  }
};
