/**
 * Accreditation Proof Service
 *
 * Generates real ZK proofs for the allowlist_membership Noir circuit using
 * @noir-lang/noir_js (witness generation) and @aztec/bb.js (UltraHonk proof
 * generation).
 *
 * The circuit proves: "I know a credential_id whose Poseidon hash is a leaf
 * in a Merkle tree with the public root, and here is my nullifier" -- without
 * revealing which leaf is mine.
 *
 * This is the private accreditation pattern: the contract verifies the proof
 * on-chain, checks the root matches its stored accredited root, and records
 * the nullifier to prevent replay.
 */

import {
  ACCREDITED_CREDENTIALS,
  MERKLE_ROOT_DEC,
  type AccreditedCredential,
} from "../util/merkleTree";

export interface AccreditationProofInputs {
  credentialId: string;
  merklePath: string[];
  pathIndices: number[];
  gameId: number;
}

export interface AccreditationProofOutput {
  proof: Uint8Array; // 14,592-byte UltraHonk proof
  merkleRoot: Uint8Array; // 32-byte big-endian Field
  nullifier: Uint8Array; // 32-byte big-endian Field
}

// Heavy modules are shared with the move-commitment proof service.
// They are loaded lazily on first proof generation.
let noirModule: typeof import("@noir-lang/noir_js") | null = null;
let bbModule: typeof import("@aztec/bb.js") | null = null;
let backendInstance: import("@aztec/bb.js").UltraHonkBackend | null = null;
let noirInstance: import("@noir-lang/noir_js").Noir | null = null;
let circuitCache: import("@noir-lang/noir_js").CompiledCircuit | null = null;

/**
 * Load the compiled allowlist_membership Noir circuit from the public directory.
 */
async function loadCircuit(): Promise<
  import("@noir-lang/noir_js").CompiledCircuit
> {
  if (circuitCache) return circuitCache;

  const response = await fetch("/circuits/allowlist_membership.json");
  if (!response.ok) {
    throw new Error(
      `Failed to load accreditation circuit: ${response.status} ${response.statusText}`,
    );
  }
  const circuit =
    (await response.json()) as import("@noir-lang/noir_js").CompiledCircuit;
  circuitCache = circuit;
  return circuit;
}

async function getNoir() {
  if (!noirModule) {
    noirModule = await import("@noir-lang/noir_js");
  }
  if (!noirInstance) {
    const circuit = await loadCircuit();
    noirInstance = new noirModule.Noir(circuit);
  }
  return noirInstance;
}

async function getBackend() {
  if (!bbModule) {
    bbModule = await import("@aztec/bb.js");
  }
  if (!backendInstance) {
    const circuit = await loadCircuit();
    backendInstance = new bbModule.UltraHonkBackend(circuit.bytecode);
  }
  return backendInstance;
}

/**
 * Convert a decimal string to a 32-byte big-endian Uint8Array.
 */
function decimalToBytes32(decimal: string): Uint8Array {
  const value = BigInt(decimal);
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[31 - i] = Number((value >> BigInt(i * 8)) & BigInt(0xff));
  }
  return bytes;
}

/**
 * Generate a real ZK proof for allowlist membership.
 *
 * The proof proves:
 *   1. The credential_id's Poseidon hash is a leaf in the Merkle tree
 *   2. The computed root matches the public merkle_root
 *   3. The nullifier = poseidon(credential_id, game_id) matches
 *
 * The proof does NOT reveal which leaf is the player's.
 */
export async function generateAccreditationProof(
  inputs: AccreditationProofInputs,
): Promise<AccreditationProofOutput> {
  // The nullifier is computed by the circuit as poseidon(credential_id, game_id).
  // We need to provide it as a public input. The circuit will assert it matches.
  // We don't pre-compute it here -- the circuit computes it and we read it from
  // the witness output. But since it's a public input, we need to provide it.
  //
  // For the Noir circuit, public inputs must be provided in the inputs map.
  // The circuit will compute the expected value and assert equality.
  // We need to compute the nullifier off-circuit to provide it.
  //
  // However, computing Poseidon in JS requires the same BN254 parameters.
  // Instead, we use a trick: run the circuit once to get the nullifier from
  // the witness, then generate the proof with the correct public inputs.
  //
  // Actually, noir_js execute() returns the witness which includes public
  // outputs. We can extract the nullifier from there. But it's simpler to
  // pre-compute it using the merkleHelper data.
  //
  // For the demo, we pre-computed nullifiers for game_id=0. For other game_ids,
  // we'd need to compute poseidon(credential_id, game_id) which requires a
  // JS Poseidon implementation. For now, we use the pre-computed values.

  // Prepare circuit inputs
  const circuitInputs = {
    credential_id: inputs.credentialId,
    merkle_path: inputs.merklePath,
    path_indices: inputs.pathIndices,
    merkle_root: MERKLE_ROOT_DEC,
    // nullifier and game_id are public inputs -- the circuit asserts they match
    // the computed values. We need to provide the correct nullifier.
    // For game_id=0, we pre-computed these. For other game_ids, we'd need
    // a JS Poseidon implementation or a helper circuit.
    nullifier: _computeNullifier(inputs.credentialId, inputs.gameId),
    game_id: inputs.gameId.toString(),
  };

  // Generate witness
  const noir = await getNoir();
  const { witness } = await noir.execute(circuitInputs);

  // Generate UltraHonk proof with keccak oracle hash (non-ZK flavor),
  // matching the on-chain verifier.
  const backend = await getBackend();
  const { proof } = await backend.generateProof(witness, { keccak: true });

  return {
    proof: new Uint8Array(proof),
    merkleRoot: decimalToBytes32(MERKLE_ROOT_DEC),
    nullifier: decimalToBytes32(circuitInputs.nullifier),
  };
}

/**
 * Pre-computed nullifiers for game_id=0.
 * For other game_ids, a JS Poseidon implementation would be needed.
 * In production, the player would compute this using their local Poseidon
 * implementation or a helper circuit.
 *
 * Values are poseidon(credential_id, game_id) with BN254 parameters.
 */
const NULLIFIERS_GAME_0: Record<string, string> = {
  "1": "18423194802802147121294641945063302532319431080857859605204660473644265519999",
  "2": "17525667638260400994329361135304146970274213890416440938331684485841550124768",
  "3": "21830820987827610497415210854943635609740877541426019865075819522092510491331",
};

function _computeNullifier(credentialId: string, gameId: number): string {
  if (gameId === 0 && credentialId in NULLIFIERS_GAME_0) {
    return NULLIFIERS_GAME_0[credentialId];
  }
  // For other game_ids, we'd need a JS Poseidon implementation.
  // This is a known limitation documented in the README.
  throw new Error(
    `Nullifier not pre-computed for credential ${credentialId}, game_id ${gameId}. ` +
      `Only game_id=0 is supported in this demo.`,
  );
}

/**
 * Get the accreditation credential for a given index (0-based).
 * Used by the demo UI to let the player select which credential to use.
 */
export function getCredential(index: number): AccreditedCredential | null {
  return ACCREDITED_CREDENTIALS[index] ?? null;
}

/**
 * Get all available accreditation credentials.
 */
export function getAllCredentials(): AccreditedCredential[] {
  return ACCREDITED_CREDENTIALS;
}
