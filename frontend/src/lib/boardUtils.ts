import { Chess } from "chess.js";
import type { PieceData } from "../types/chess";

/**
 * Extracts all pieces from a chess.js instance and gives them stable IDs.
 * The ID is based on their current square (e.g., "wp-e2").
 * NOTE: When we add animations later, we will track IDs across moves.
 */
export function getPiecesFromBoard(chess: Chess): PieceData[] {
  const pieces: PieceData[] = [];
  const board = chess.board();

  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const piece = board[r][f];
      if (piece) {
        pieces.push({
          id: `${piece.color}${piece.type}-${piece.square}`,
          type: piece.type,
          color: piece.color,
          square: piece.square,
        });
      }
    }
  }

  return pieces;
}
