// ZK Move Commitment Circuit for Zero-Knowledge Prisoner's Dilemma
//
// Proves that a player knows a valid game move (Cooperate=0 or Defect=1)
// and a nonce, such that pedersen(move, nonce, player_address, game_id)
// equals the public commitment.
//
// The key property: the contract can verify the commitment is to a VALID
// game move without learning WHICH move was chosen. This prevents players
// from committing to garbage and only revealing a winning move after seeing
// the opponent's reveal.
//
// Using Pedersen hash (built into Noir stdlib) for simplicity.
// Can be upgraded to Poseidon2 when integrating with Stellar Protocol 25 host
// functions for cheaper on-chain verification.

global PLAYER_MOVE_COOPERATE: Field = 0;
global PLAYER_MOVE_DEFECT: Field = 1;

fn main(
    // Private inputs (known only to the player)
    move: Field,
    nonce: Field,

    // Public inputs (visible on-chain)
    commitment: pub Field,
    player_address: pub Field,
    game_id: pub Field,
) {
    // Constraint 1: move must be valid (0 = Cooperate or 1 = Defect)
    // This is the core ZK guarantee: the commitment is to a real game move
    let is_cooperate = move == PLAYER_MOVE_COOPERATE;
    let is_defect = move == PLAYER_MOVE_DEFECT;
    let is_valid_move = is_cooperate | is_defect;
    assert(is_valid_move, "Move must be 0 (Cooperate) or 1 (Defect)");

    // Constraint 2: commitment must match pedersen(move, nonce, player_address, game_id)
    // This binds the commitment to the specific player and game, preventing
    // replay of a commitment across different games
    let computed_commitment = std::hash::pedersen_hash([
        move,
        nonce,
        player_address,
        game_id,
    ]);

    assert(computed_commitment == commitment, "Commitment does not match inputs");
}
