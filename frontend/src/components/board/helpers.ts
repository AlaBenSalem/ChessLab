import type { Chess, Color, Square } from "chess.js";

/** Each square is 1/8 of the board, in percent. */
export const SQUARE_SIZE = 12.5;

export type KingRole = "check" | "loser" | "winner";

export function findKingSquare(chess: Chess, color: Color): Square | null {
  for (const row of chess.board()) {
    for (const piece of row) {
      if (piece && piece.type === "k" && piece.color === color) {
        return piece.square;
      }
    }
  }
  return null;
}

export const KING_HIGHLIGHT: Record<KingRole, string> = {
  check:
    "radial-gradient(circle, rgba(255,0,0,0.8) 0%, rgba(231,0,0,1) 25%, rgba(169,0,0,0) 80%)",
  loser:
    "radial-gradient(circle, rgba(255,0,0,0.9) 0%, rgba(220,0,0,1) 35%, rgba(169,0,0,0) 85%)",
  winner:
    "radial-gradient(circle, rgba(59,130,246,0.9) 0%, rgba(37,99,235,1) 35%, rgba(29,78,216,0) 85%)",
};

export function getDrawReason(chess: Chess): string {
  if (chess.isStalemate()) return "Stalemate";
  if (chess.isInsufficientMaterial()) return "Insufficient material";
  if (chess.isThreefoldRepetition()) return "Threefold repetition";
  return "Fifty-move rule";
}
