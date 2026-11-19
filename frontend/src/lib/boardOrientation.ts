import type { Color } from "chess.js";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"];

export interface BoardOrientation {
  /** Labels in the order they are drawn, left to right. */
  files: string[];
  /** Labels in the order they are drawn, top to bottom. */
  ranks: string[];
  topColor: Color;
  bottomColor: Color;
}

// Built once so consumers get a stable reference between renders.
const WHITE_AT_BOTTOM: BoardOrientation = {
  files: FILES,
  ranks: RANKS,
  topColor: "b",
  bottomColor: "w",
};

const BLACK_AT_BOTTOM: BoardOrientation = {
  files: [...FILES].reverse(),
  ranks: [...RANKS].reverse(),
  topColor: "w",
  bottomColor: "b",
};

export const getBoardOrientation = (isFlipped: boolean): BoardOrientation =>
  isFlipped ? BLACK_AT_BOTTOM : WHITE_AT_BOTTOM;
