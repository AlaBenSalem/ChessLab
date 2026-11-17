import type { Color, PieceSymbol, Square } from "chess.js";

export interface PieceData {
  id: string; // Stable ID for animation (e.g., "wp-e2")
  type: PieceSymbol; // 'p', 'n', 'b', 'r', 'q', 'k'
  color: Color; // 'w' | 'b'
  square: Square; // 'e4', 'a1', etc.
}

export const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
export const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"] as const;
