import type { Chess, Color } from "chess.js";

type PgnHeaders = ReturnType<Chess["header"]>;

export interface PlayerInfo {
  name: string;
  rating: string;
  engine: boolean;
}

interface PlayerInfoContext {
  headers: PgnHeaders;
  computerMode: boolean;
  computerColor: Color | null | undefined;
  /** Display rating (range) of the selected engine difficulty. */
  engineRating: string;
}

const UNRATED = "Unrated";

/** PGN uses "?" for unknown values; treat it (and empty values) as missing. */
const knownOr = (value: string | null | undefined, fallback: string) =>
  value && value !== "?" ? value : fallback;

export function getPlayerInfo(
  color: Color,
  { headers, computerMode, computerColor, engineRating }: PlayerInfoContext,
): PlayerInfo {
  if (computerMode) {
    return color === computerColor
      ? { name: "Stockfish", rating: engineRating, engine: true }
      : { name: "You", rating: UNRATED, engine: false };
  }

  const isWhite = color === "w";
  return {
    name: knownOr(isWhite ? headers.White : headers.Black, isWhite ? "White" : "Black"),
    rating: knownOr(isWhite ? headers.WhiteElo : headers.BlackElo, UNRATED),
    engine: false,
  };
}
