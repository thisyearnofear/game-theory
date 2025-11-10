import * as Client from '../../packages/prisoners_dilemma';
import { rpcUrl } from './util';

// Create a function that returns a new client with the given public key
export const createPDClient = (publicKey: string) => {
  return new Client.Client({
    networkPassphrase: 'Test SDF Network ; September 2015',
    contractId: 'CDY3NB4ZS5DTF3CEAHNXTZ4QFJXZKHECE7HIAPMMDNNJW7CNDPG274TF',
    rpcUrl,
    allowHttp: true,
    publicKey,
  });
};

// Default client for backwards compatibility (will need publicKey set before use)
export default new Client.Client({
  networkPassphrase: 'Test SDF Network ; September 2015',
  contractId: 'CDY3NB4ZS5DTF3CEAHNXTZ4QFJXZKHECE7HIAPMMDNNJW7CNDPG274TF',
  rpcUrl,
  allowHttp: true,
  publicKey: undefined,
});
