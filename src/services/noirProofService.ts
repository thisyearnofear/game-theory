/**
 * Noir Proof Service
 *
 * Generates real ZK proofs for the move_commitment Noir circuit using
 * @noir-lang/noir_js (witness generation) and @aztec/bb.js (UltraHonk proof
 * generation).
 *
 * The circuit proves: keccak256(move || nonce || game_id) == commitment
 * where move is constrained to 0 (Cooperate) or 1 (Defect).
 *
 * This makes ZK load-bearing: at commit time the contract verifies the proof,
 * guaranteeing the commitment is to a valid move with a known preimage. Without
 * the proof, a player could commit to an arbitrary hash and grief the opponent.
 */

import { keccak_256 } from "@noble/hashes/sha3.js";

export interface ProofInputs {
  move: 0 | 1; // 0 = Cooperate, 1 = Defect
  nonce: bigint;
  gameId: number;
}

export interface ProofOutput {
  proof: Uint8Array; // 14,592-byte UltraHonk proof
  commitment: Uint8Array; // 32-byte keccak256 hash
}

export interface CommitmentInput {
  move: 0 | 1;
  nonce: bigint;
  gameId: number;
}

// Heavy modules (bb.js ~7MB, noir_js ~4MB) are loaded lazily on first proof
// generation, not on page load. This keeps the initial bundle small.
let noirModule: typeof import("@noir-lang/noir_js") | null = null;
let bbModule: typeof import("@aztec/bb.js") | null = null;
let backendInstance: import("@aztec/bb.js").UltraHonkBackend | null = null;
let noirInstance: import("@noir-lang/noir_js").Noir | null = null;
let circuitCache: import("@noir-lang/noir_js").CompiledCircuit | null = null;

/**
 * Load the compiled Noir circuit from the public directory.
 */
async function loadCircuit(): Promise<
  import("@noir-lang/noir_js").CompiledCircuit
> {
  if (circuitCache) return circuitCache;

  const response = await fetch("/circuits/move_commitment.json");
  if (!response.ok) {
    throw new Error(
      `Failed to load circuit: ${response.status} ${response.statusText}`,
    );
  }
  const circuit =
    (await response.json()) as import("@noir-lang/noir_js").CompiledCircuit;
  circuitCache = circuit;
  return circuit;
}

/**
 * Get or create the singleton Noir instance.
 * Lazily imports @noir-lang/noir_js on first call.
 */
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

/**
 * Get or create the singleton UltraHonkBackend instance.
 * Lazily imports @aztec/bb.js on first call.
 *
 * bb.js 0.87.0: the constructor takes the ACIR bytecode and initializes its
 * own Barretenberg WASM internally (no separate api argument).
 */
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
 * Compute the keccak256 commitment hash matching the contract's verify_reveal.
 *
 * Preimage: move_byte (1 byte) || nonce (8 bytes BE) || game_id (8 bytes BE) = 17 bytes
 * This is the SAME hash the Noir circuit constrains.
 */
export function computeCommitment(input: CommitmentInput): Uint8Array {
  const bytes = new Uint8Array(17);

  // move byte
  bytes[0] = input.move;

  // nonce as big-endian u64
  const nonceBuf = new Uint8Array(8);
  for (let i = 0; i < 8; i++) {
    nonceBuf[7 - i] = Number((input.nonce >> BigInt(i * 8)) & BigInt(0xff));
  }
  bytes.set(nonceBuf, 1);

  // game_id as big-endian u64
  const gameId = BigInt(input.gameId);
  const gameIdBuf = new Uint8Array(8);
  for (let i = 0; i < 8; i++) {
    gameIdBuf[7 - i] = Number((gameId >> BigInt(i * 8)) & BigInt(0xff));
  }
  bytes.set(gameIdBuf, 9);

  return keccak_256(bytes);
}

/**
 * Convert a 16-byte big-endian array to a decimal string (u128).
 */
function bytes16ToDecimal(bytes: Uint8Array): string {
  let result = BigInt(0);
  for (let i = 0; i < 16; i++) {
    result = result * BigInt(256) + BigInt(bytes[i]);
  }
  return result.toString();
}

/**
 * Generate a high-entropy random nonce for commitment.
 */
export function generateNonce(): bigint {
  const buf = new Uint8Array(8);
  crypto.getRandomValues(buf);
  let nonce = BigInt(0);
  for (let i = 0; i < 8; i++) {
    nonce = (nonce << BigInt(8)) | BigInt(buf[i]);
  }
  return nonce;
}

/**
 * Generate a real ZK proof for a move commitment.
 *
 * Uses @noir-lang/noir_js for witness generation and @aztec/bb.js for
 * UltraHonk proof generation. The proof is 14,592 bytes and verifies
 * on-chain via the ultrahonk-soroban-verifier.
 *
 * The proof guarantees:
 *   1. The move is valid (0 = Cooperate or 1 = Defect)
 *   2. The player knows the nonce that hashes to the commitment
 *   3. The commitment is bound to the specific game_id
 */
export async function generateProof(inputs: ProofInputs): Promise<ProofOutput> {
  // Compute the commitment (same keccak256 the contract uses)
  const commitment = computeCommitment(inputs);

  // Split 32-byte commitment into two 128-bit halves for the circuit's
  // public inputs (commitment_high, commitment_low)
  const commitmentHigh = bytes16ToDecimal(commitment.slice(0, 16));
  const commitmentLow = bytes16ToDecimal(commitment.slice(16, 32));

  // Prepare circuit inputs
  const circuitInputs = {
    move: inputs.move.toString(),
    nonce: inputs.nonce.toString(),
    commitment_high: commitmentHigh,
    commitment_low: commitmentLow,
    game_id: inputs.gameId.toString(),
  };

  // Generate witness
  const noir = await getNoir();
  const { witness } = await noir.execute(circuitInputs);

  // Generate UltraHonk proof with the keccak oracle hash (non-ZK), matching the
  // on-chain verifier (NethermindEth/rs-soroban-ultrahonk). It expects the
  // non-ZK keccak UltraHonk proof: exactly 456 fields = 14,592 bytes, produced
  // by `bb prove --oracle_hash keccak` with no --zk flag.
  //
  // In bb.js 0.87.0, `{ keccak: true }` selects keccak challenges with ZK
  // disabled (the EVM-verifier flavor). Do NOT use `{ keccakZK: true }` — that
  // produces the larger ZK-flavored proof that fails on-chain verification.
  const backend = await getBackend();
  const { proof } = await backend.generateProof(witness, { keccak: true });

  return {
    proof: new Uint8Array(proof),
    commitment,
  };
}

/**
 * Verify a proof client-side before submission (optional sanity check).
 * Uses the same bb.js backend that generated the proof.
 */
export async function verifyProof(
  proof: Uint8Array,
  publicInputs: string[],
): Promise<boolean> {
  const backend = await getBackend();
  // Must use the same keccak (non-ZK) flavor the proof was generated with.
  return backend.verifyProof({ proof, publicInputs }, { keccak: true });
}
