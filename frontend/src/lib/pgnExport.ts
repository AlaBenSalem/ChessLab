import { Chess } from "chess.js";
import type { getOpeningForMoves } from "./openingBook";

type Opening = ReturnType<typeof getOpeningForMoves>;

const SITE = "ChessLab";

interface BuildPgnOptions {
  /** The live game. It is only read, never mutated. */
  chess: Chess;
  event: string;
  whiteName: string;
  blackName: string;
  result: string;
  /** Recognised opening; falls back to the game's own ECO/Opening headers. */
  opening: Opening | null;
  /** `[baseSeconds, incrementSeconds]`; omit for untimed games. */
  timeControl?: readonly [number, number];
}

const formatPgnDate = (date: Date) =>
  `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;

/**
 * Builds a PGN by replaying the game on a fresh `Chess` instance, so the
 * store's board (and its headers) are never touched.
 */
export function buildPgn({
  chess,
  event,
  whiteName,
  blackName,
  result,
  opening,
  timeControl,
}: BuildPgnOptions): string {
  const headers = chess.header();
  const startFen = headers.FEN;
  const exported = startFen ? new Chess(startFen) : new Chess();

  exported.header(
    "Event", event,
    "Site", SITE,
    "Date", formatPgnDate(new Date()),
    "Round", "-",
    "White", whiteName,
    "Black", blackName,
    "Result", result,
  );
  if (startFen) exported.header("SetUp", "1", "FEN", startFen);

  const eco = opening?.eco ?? headers.ECO;
  const openingName = opening?.name ?? headers.Opening;
  if (eco) exported.header("ECO", eco);
  if (openingName) exported.header("Opening", openingName);
  if (timeControl) exported.header("TimeControl", `${timeControl[0]}+${timeControl[1]}`);

  for (const { from, to, promotion } of chess.history({ verbose: true })) {
    exported.move({ from, to, promotion });
  }
  return exported.pgn({ maxWidth: 80, newline: "\n" });
}
