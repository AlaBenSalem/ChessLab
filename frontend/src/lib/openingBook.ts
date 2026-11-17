import { Chess } from "chess.js";

interface EcoEntry {
  eco: string;
  name: string;
  pgn: string;
  fen: string;
}

export interface OpeningRecognition {
  eco: string;
  name: string;
}

interface OpeningLineMatch {
  entry: EcoEntry;
  remainingMoves: number;
}

const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -";

let bookFens: Set<string> | null = null;
let bookData: EcoEntry[] | null = null;
let bookMoves: Map<string, Set<string>> | null = null;
let openingsByMovePrefix: Map<string, OpeningLineMatch> | null = null;
let loadPromise: Promise<void> | null = null;

function normalizeFen(fen: string): string {
  return fen.split(" ").slice(0, 4).join(" ");
}

export async function loadOpeningBook(): Promise<void> {
  if (bookFens) return;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const response = await fetch("/openings/openings.json");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = (await response.json()) as EcoEntry[];
      bookData = data;
      bookFens = new Set(data.map((e) => normalizeFen(e.fen)));
      bookMoves = new Map();
      openingsByMovePrefix = new Map();
      for (const entry of data) {
        try {
          const game = new Chess();
          game.loadPgn(entry.pgn);
          const sanMoves = game.history();
          for (let length = 1; length <= sanMoves.length; length++) {
            const key = sanMoves.slice(0, length).join(" ");
            const remainingMoves = sanMoves.length - length;
            const existing = openingsByMovePrefix.get(key);
            if (!existing || remainingMoves < existing.remainingMoves) {
              openingsByMovePrefix.set(key, { entry, remainingMoves });
            }
          }
          const replay = new Chess();
          for (const move of game.history({ verbose: true })) {
            const key = normalizeFen(replay.fen());
            const allowed = bookMoves.get(key) ?? new Set<string>();
            allowed.add(move.san);
            bookMoves.set(key, allowed);
            replay.move(move.san);
          }
        } catch {
          // Ignore malformed individual ECO lines while retaining the book.
        }
      }
      console.log(
        `[Book] Loaded ${bookFens.size} opening positions (${data.length} ECO lines)`,
      );
    } catch (err) {
      console.error("[Book] Failed to load openings:", err);
      bookFens = new Set();
      bookData = [];
    }
  })();

  return loadPromise;
}

export function isBookPosition(fen: string): boolean {
  if (normalizeFen(fen) === STARTING_FEN) return true;
  if (!bookFens) return false;
  return bookFens.has(normalizeFen(fen));
}

export function isBookMove(fen: string, san: string): boolean {
  return bookMoves?.get(normalizeFen(fen))?.has(san) ?? false;
}

export function getOpeningName(fen: string): string | null {
  if (normalizeFen(fen) === STARTING_FEN) return null;
  if (!bookData) return null;
  const n = normalizeFen(fen);
  return bookData.find((e) => normalizeFen(e.fen) === n)?.name ?? null;
}

/** Return the most specific known opening along the played SAN move sequence. */
export function getOpeningForMoves(sanMoves: readonly string[]): OpeningRecognition | null {
  if (!openingsByMovePrefix || sanMoves.length === 0) return null;
  for (let length = sanMoves.length; length > 0; length--) {
    const match = openingsByMovePrefix.get(sanMoves.slice(0, length).join(" "));
    if (match) return { eco: match.entry.eco, name: match.entry.name };
  }
  return null;
}

export function isBookLoaded(): boolean {
  return bookFens !== null;
}
