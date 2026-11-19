import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Chess } from "chess.js";
import { buildPgn } from "./pgnExport";

const base = { event: "Casual Game", whiteName: "White", blackName: "Black", result: "*", opening: null } as const;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 19));
});
afterEach(() => vi.useRealTimers());

describe("buildPgn", () => {
  it("writes the standard tags and the moves", () => {
    const chess = new Chess();
    chess.move("e4");
    chess.move("e5");
    const pgn = buildPgn({ chess, ...base });

    expect(pgn).toContain('[Event "Casual Game"]');
    expect(pgn).toContain('[Site "ChessLab"]');
    expect(pgn).toContain('[Date "2026.11.19"]');
    expect(pgn).toContain("1. e4 e5");
  });

  it("adds the recognised opening, falling back to the game's own headers", () => {
    const chess = new Chess();
    chess.loadPgn('[ECO "B20"]\n[Opening "Sicilian"]\n\n1. e4 c5');

    expect(buildPgn({ chess, ...base })).toContain('[Opening "Sicilian"]');
    const recognised = buildPgn({ chess, ...base, opening: { eco: "B20", name: "Sicilian Defense" } });
    expect(recognised).toContain('[Opening "Sicilian Defense"]');
  });

  it("writes TimeControl only for timed games", () => {
    const chess = new Chess();
    expect(buildPgn({ chess, ...base })).not.toContain("TimeControl");
    expect(buildPgn({ chess, ...base, timeControl: [180, 2] })).toContain('[TimeControl "180+2"]');
  });

  it("keeps the starting position of games set up from a FEN", () => {
    const fen = "8/P6k/8/8/8/8/8/K7 w - - 0 1";
    const chess = new Chess(fen);
    chess.move("a8=Q");
    const pgn = buildPgn({ chess, ...base });

    expect(pgn).toContain('[SetUp "1"]');
    expect(pgn).toContain(`[FEN "${fen}"]`);
    expect(pgn).toContain("a8=Q");
  });

  it("does not mutate the live game", () => {
    const chess = new Chess();
    chess.move("e4");
    const before = { fen: chess.fen(), headers: { ...chess.header() } };
    buildPgn({ chess, ...base, result: "1-0" });
    expect({ fen: chess.fen(), headers: chess.header() }).toEqual(before);
  });
});
