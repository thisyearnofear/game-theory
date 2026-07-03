/**
 * Pre-computed Merkle tree data for the private accreditation demo.
 *
 * The tree is a depth-4 Poseidon Merkle tree (16 leaves) with:
 *   - leaf 0: hash_1(credential_id=1)
 *   - leaf 1: hash_1(credential_id=2)
 *   - leaf 2: hash_1(credential_id=3)
 *   - leaves 3-15: hash_1(0) (empty)
 *
 * Poseidon hashing uses the BN254 parameters from noir-lang/poseidon
 * (hash_1 for leaves, hash_2 for internal nodes), matching the
 * allowlist_membership Noir circuit.
 *
 * In a production system, the operator would build this tree off-chain
 * and publish only the root on-chain. Each accredited player would
 * receive their credential_id and Merkle path privately.
 */

export interface AccreditedCredential {
  credentialId: string;
  merklePath: string[]; // 4 sibling hashes
  pathIndices: number[]; // 4 bits: 0 = left, 1 = right
}

export const MERKLE_DEPTH = 4;

/**
 * The Merkle root for this tree, as a 32-byte hex string (no 0x prefix).
 * Computed: poseidon tree over credentials 1, 2, 3.
 */
export const MERKLE_ROOT_HEX =
  "0365f89de0694dbea484dd2398a834789602f837cd2c30aedfc064e174d14f6a";

/**
 * The Merkle root as a decimal string (for Noir circuit input).
 */
export const MERKLE_ROOT_DEC =
  "1537105988731319544176840380366522137103305355462203228976968784844464148330";

/**
 * Pre-computed accreditation credentials for the demo.
 * Each credential has its Merkle path pre-computed so the player
 * can generate a ZK proof without needing to compute Poseidon hashes
 * in the browser.
 */
export const ACCREDITED_CREDENTIALS: AccreditedCredential[] = [
  {
    credentialId: "1",
    // leaf 0: all left children
    merklePath: [
      "8645981980787649023086883978738420856660271013038108762834452721572614684349",
      "19648187019019537525857121603325044377306264581259958779194975164167162831906",
      "2186774891605521484511138647132707263205739024356090574223746683689524510919",
      "6624528458765032300068640025753348171674863396263322163275160878496476761795",
    ],
    pathIndices: [0, 0, 0, 0],
  },
  {
    credentialId: "2",
    // leaf 1: right at level 0, then left
    merklePath: [
      "18586133768512220936620570745912940619677854269274689475585506675881198879027",
      "19648187019019537525857121603325044377306264581259958779194975164167162831906",
      "2186774891605521484511138647132707263205739024356090574223746683689524510919",
      "6624528458765032300068640025753348171674863396263322163275160878496476761795",
    ],
    pathIndices: [1, 0, 0, 0],
  },
  {
    credentialId: "3",
    // leaf 2: left at level 0, right at level 1, then left
    merklePath: [
      "19014214495641488759237505126948346942972912379615652741039992445865937985820",
      "10058687713083746196667355667918512760470030038024584531967182749893253193558",
      "2186774891605521484511138647132707263205739024356090574223746683689524510919",
      "6624528458765032300068640025753348171674863396263322163275160878496476761795",
    ],
    pathIndices: [0, 1, 0, 0],
  },
];

/**
 * Convert a decimal string to a 32-byte big-endian Buffer.
 * Used for serializing Field elements for the Soroban contract.
 */
export function decimalToBytes32(decimal: string): Uint8Array {
  const value = BigInt(decimal);
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[31 - i] = Number((value >> BigInt(i * 8)) & BigInt(0xff));
  }
  return bytes;
}

/**
 * Convert a hex string to a 32-byte Buffer.
 */
export function hexToBytes32(hex: string): Uint8Array {
  const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(cleanHex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Get the Merkle root as a 32-byte Buffer for contract calls.
 */
export function getMerkleRootBytes(): Uint8Array {
  return hexToBytes32(MERKLE_ROOT_HEX);
}
