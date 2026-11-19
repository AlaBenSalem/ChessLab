import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import { getGameOverTitle, getPgnResult, parseComputerResult } from "./gameResult";

const play = (sans: string, fen?: string) => {
  const chess = new Chess(fen);
  sans.split(" ").filter(Boolean).forEach((san) => chess.move(san));
  return chess;
};

describe("parseComputerResult", () => {
  it("recognises the three outcomes and ignores everything else", () => {
    expect(parseComputerResult("Draw by agreement")).toBe("draw");
    expect(parseComputerResult("You win on time")).toBe("player-win");
    expect(parseComputerResult("Stockfish wins by checkmate")).toBe("engine-win");
    expect(parseComputerResult("")).toBeNull();
  });
});

describe("getPgnResult", () => {
  it("scores checkmates from the board", () => {
    expect(getPgnResult(play("e4 e5 Bc4 Nc6 Qh5 Nf6 Qxf7"), null, null, null)).toBe("1-0");
    expect(getPgnResult(play("f3 e5 g4 Qh4"), null, null, null)).toBe("0-1");
  });

  it("scores draws, including stalemate, which isDraw() covers", () => {
    expect(getPgnResult(new Chess("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1"), null, null, null)).toBe("1/2-1/2");
    expect(getPgnResult(play("e4"), "draw", null, null)).toBe("1/2-1/2");
  });

  it("maps a computer-game outcome to the winner's colour", () => {
    expect(getPgnResult(play("e4"), "player-win", "b", "w")).toBe("0-1");
    expect(getPgnResult(play("e4"), "engine-win", "b", "w")).toBe("1-0");
  });

  it("falls back to the game's own Result tag, then to an unfinished marker", () => {
    const imported = new Chess();
    imported.loadPgn('[Result "0-1"]\n\n1. e4 e5 0-1');
    expect(getPgnResult(imported, null, null, null)).toBe("0-1");
    expect(getPgnResult(play("e4"), null, null, null)).toBe("*");
  });
});

describe("getGameOverTitle", () => {
  const base = { isDraw: false, winnerColor: null, computerColor: "b" } as const;

  it("prefers a draw", () => {
    expect(getGameOverTitle({ ...base, outcome: "draw" })).toBe("Draw");
    expect(getGameOverTitle({ ...base, outcome: null, isDraw: true })).toBe("Draw");
  });

  it("reports defeat when the engine won", () => {
    expect(getGameOverTitle({ ...base, outcome: "engine-win" })).toBe("Defeat");
    expect(getGameOverTitle({ ...base, outcome: null, winnerColor: "b" })).toBe("Defeat");
  });

  it("reports victory otherwise", () => {
    expect(getGameOverTitle({ ...base, outcome: "player-win" })).toBe("Victory");
    expect(getGameOverTitle({ ...base, outcome: null, winnerColor: "w" })).toBe("Victory");
  });
});
