// ZK Move Commitment Circuit for Zero-Knowledge Prisoner's Dilemma
//
// Proves that a player knows a valid game move (Cooperate=0 or Defect=1)
// and a nonce, such that keccak256(move_byte || nonce || game_id) equals
// the public commitment.
//
// The commitment hash uses keccak256 -- the SAME primitive the Soroban
// contract uses in verify_reveal. This makes the ZK proof load-bearing:
// at commit time the contract verifies the ZK proof, guaranteeing the
// commitment is to a VALID move (0 or 1) and that the player knows the
// preimage. At reveal time the contract re-derives keccak256 from the
// revealed (move, nonce, game_id) and checks it matches the stored
// commitment. Without the ZK proof at commit time, a player could commit
// to an arbitrary hash with no valid preimage, griefing the opponent.
//
// The 32-byte keccak256 output is split into two 128-bit Field public
// inputs (high/low) to keep the public input count at 3 (96 bytes).

use dep::keccak256::keccak256;

global PLAYER_MOVE_COOPERATE: Field = 0;
global PLAYER_MOVE_DEFECT: Field = 1;

/// Convert 16 big-endian bytes to a Field (fits in 128 bits < 254-bit Field).
fn bytes16_to_field(bytes: [u8; 16]) -> Field {
    let mut result: Field = 0;
    for i in 0..16 {
        result = result * 256 + bytes[i] as Field;
    }
    result
}

fn main(
    // Private inputs (known only to the player)
    move: Field,
    nonce: u64,

    // Public inputs (visible on-chain, serialized as 32-byte Fr elements)
    commitment_high: pub Field, // first 16 bytes of keccak256 output (BE u128)
    commitment_low: pub Field,  // last 16 bytes of keccak256 output (BE u128)
    game_id: pub u64,
) {
    // Constraint 1: move must be valid (0 = Cooperate or 1 = Defect)
    let is_cooperate = move == PLAYER_MOVE_COOPERATE;
    let is_defect = move == PLAYER_MOVE_DEFECT;
    let is_valid_move = is_cooperate | is_defect;
    assert(is_valid_move, "Move must be 0 (Cooperate) or 1 (Defect)");

    let move_byte = move as u8;

    // Build preimage: move_byte(1) || nonce(8 BE) || game_id(8 BE) = 17 bytes
    // This MUST match the contract's verify_reveal preimage exactly.
    let mut preimage: [u8; 17] = [0; 17];
    preimage[0] = move_byte;

    for i in 0..8 {
        let idx: u32 = 1 + i;
        preimage[idx] = (nonce >> ((7 - i) * 8) as u8) as u8;
    }

    for i in 0..8 {
        let idx: u32 = 9 + i;
        preimage[idx] = (game_id >> ((7 - i) * 8) as u8) as u8;
    }

    // Compute keccak256 -- same primitive as the Soroban host function
    let computed: [u8; 32] = keccak256(preimage, 17);

    // Split 32-byte hash into two 16-byte halves and convert to Fields
    let mut high_bytes: [u8; 16] = [0; 16];
    let mut low_bytes: [u8; 16] = [0; 16];
    for i in 0..16 {
        let idx: u32 = i;
        let idx2: u32 = 16 + i;
        high_bytes[idx] = computed[idx];
        low_bytes[idx] = computed[idx2];
    }

    let computed_high = bytes16_to_field(high_bytes);
    let computed_low = bytes16_to_field(low_bytes);

    // Constraint 2: commitment must match keccak256(move || nonce || game_id)
    assert(computed_high == commitment_high, "Commitment high mismatch");
    assert(computed_low == commitment_low, "Commitment low mismatch");
}
