// ZK Allowlist Membership Circuit for Trustfall
//
// Proves that a player holds a credential whose hash is a leaf in a Merkle tree
// with a publicly known root -- WITHOUT revealing which leaf is theirs.
//
// This is the "private accreditation" pattern: a game operator publishes a
// Merkle root of accredited participants on-chain. A player proves membership
// without revealing their identity, and emits a nullifier so the same credential
// cannot be reused for the same game (replay protection).
//
// Uses Poseidon hashing -- a ZK-friendly hash for which Stellar Protocol 25
// ("X-Ray") introduced native host functions, making on-chain verification
// of Poseidon-based proofs cheap.
//
// Public inputs (each serialized as a 32-byte big-endian Field element):
//   1. merkle_root  -- the public root the contract stores
//   2. nullifier    -- poseidon(credential_id, game_id), prevents replay
//   3. game_id      -- binds the proof to a specific game
//
// The contract verifies the UltraHonk proof, checks merkle_root matches its
// stored accredited root, and records the nullifier so the same credential
// can't accredit twice for the same game.

use dep::poseidon::poseidon::bn254::{hash_1, hash_2};

global MERKLE_DEPTH: u32 = 4; // 16 leaves -- enough for a demo allowlist

fn main(
    // Private inputs (known only to the player)
    credential_id: Field,
    merkle_path: [Field; 4], // sibling hashes at each level
    path_indices: [u8; 4],   // 0 = leaf is left child, 1 = leaf is right child

    // Public inputs (visible on-chain, 32-byte BE Field elements)
    merkle_root: pub Field,
    nullifier: pub Field,
    game_id: pub Field,
) {
    // Leaf = hash_1(credential_id). The operator builds the tree over these
    // leaf hashes, so the credential_id itself never appears on-chain.
    let mut current: Field = hash_1([credential_id]);

    // Walk up the Merkle tree, hashing with siblings at each level.
    for i in 0..MERKLE_DEPTH {
        let sibling: Field = merkle_path[i];
        // Convert path index to a Field-constrained boolean (0 or 1).
        // Quadratic constraint: idx^2 == idx  <=>  idx in {0, 1}.
        let idx: Field = path_indices[i] as Field;
        assert(idx * idx == idx, "path index must be 0 or 1");

        // Conditional swap via arithmetic (no branching):
        //   idx == 0 -> left = current, right = sibling
        //   idx == 1 -> left = sibling,  right = current
        let left: Field = current * (1 - idx) + sibling * idx;
        let right: Field = sibling * (1 - idx) + current * idx;

        current = hash_2([left, right]);
    }

    // Constraint 1: computed root must match the public root
    assert(current == merkle_root, "Merkle root mismatch");

    // Constraint 2: nullifier = hash_2(credential_id, game_id)
    // This binds the proof to a specific game and lets the contract prevent
    // the same credential from accrediting twice for the same game_id.
    let computed_nullifier: Field = hash_2([credential_id, game_id]);
    assert(computed_nullifier == nullifier, "Nullifier mismatch");
}
