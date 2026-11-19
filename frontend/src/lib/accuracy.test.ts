import { afterEach, describe, expect, it, vi } from "vitest";
import { Chess } from "chess.js";
import { useGameStore } from "../store/gameStore";
import { getPiecesFromBoard } from "./boardUtils";
import {
  accuracyFromLoss,
  aggregateAccuracy,
  compareContinuations,
  expectedScore,
  toWhitePov,
  type AccuracySample,
} from "./accuracy";
import type { EngineEvaluation } from "../engine/StockfishEngine";
import {
  buildGameAnalysisResult,
  type AnalyzedMove,
} from "../hooks/useGameAnalysis";
import { StockfishEngine, terminalEvaluation } from "../engine/StockfishEngine";

afterEach(() => vi.unstubAllGlobals());

const cp = (scoreValue: number): EngineEvaluation => ({
  depth: 14,
  scoreType: "cp",
  scoreValue,
  bestMove: "e2e4",
  lines: [],
});

const mate = (scoreValue: number): EngineEvaluation => ({
  depth: 14,
  scoreType: "mate",
  scoreValue,
  bestMove: "e2e4",
  lines: [],
});

describe("engine score perspective and move quality", () => {
  it("converts scores from either side to move into White's perspective", () => {
    const whiteToMoveFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    const blackToMoveFen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";
    expect(toWhitePov(cp(30), whiteToMoveFen).scoreValue).toBe(30);
    expect(toWhitePov(cp(-30), blackToMoveFen).scoreValue).toBe(30);
    expect(toWhitePov(cp(-30), blackToMoveFen).scoreValue / 100).toBeCloseTo(0.3);
  });

  it("uses the mating side when UCI reports mate zero", () => {
    const checkmatedWhite = "7k/6Q1/6K1/8/8/8/8/8 w - - 0 1";
    const checkmatedBlack = "8/8/8/8/8/6k1/6q1/7K b - - 0 1";
    const whiteLoses = toWhitePov(mate(0), checkmatedWhite);
    const blackLoses = toWhitePov(mate(0), checkmatedBlack);
    expect(Object.is(whiteLoses.scoreValue, -0)).toBe(true);
    expect(Object.is(blackLoses.scoreValue, -0)).toBe(false);
    expect(expectedScore(whiteLoses, "w")).toBe(0);
    expect(expectedScore(blackLoses, "w")).toBe(1);
  });

  it("keeps parsed UCI scores in the side-to-move perspective", async () => {
    const commands: string[] = [];
    class FakeWorker extends EventTarget {
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: ((event: ErrorEvent) => void) | null = null;
      postMessage(command: string) {
        commands.push(command);
        const respond = (data: string) => {
          const event = new MessageEvent("message", { data });
          this.onmessage?.(event);
          this.dispatchEvent(event);
        };
        if (command === "uci") respond("uciok");
        else if (command === "isready") respond("readyok");
        else if (command.startsWith("go ")) {
          respond("info depth 14 multipv 1 score cp 145 pv e7e5");
          respond("info depth 14 multipv 2 score cp 50 pv d7d5");
          respond("bestmove e7e5");
        }
      }
      terminate() {}
    }
    vi.stubGlobal("Worker", FakeWorker);

    const engine = new StockfishEngine();
    const evaluation = await engine.evaluate(
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1",
      14,
      { nodes: 180_000, searchMove: "e7e5" },
    );
    await engine.dispose();

    expect(evaluation.scoreValue).toBe(145);
    expect(evaluation.bestMove).toBe("e7e5");
    expect(evaluation.lines.map((line) => line.cp)).toEqual([145, 50]);
    const whitePov = toWhitePov(evaluation, "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1");
    expect(whitePov.scoreValue).toBe(-145);
    expect(whitePov.lines.map((line) => line.cp)).toEqual([-145, -50]);
    expect(commands).toContain("go nodes 180000 searchmoves e7e5");
  });

  it("keeps White and Black evaluation perspectives consistent", () => {
    expect(expectedScore(cp(100), "w")).toBeGreaterThan(0.5);
    expect(expectedScore(cp(100), "b")).toBeLessThan(0.5);
    expect(expectedScore(cp(-100), "b")).toBeGreaterThan(0.5);
  });

  it("maps mate to the winning player's outcome", () => {
    expect(expectedScore(mate(3), "w")).toBe(1);
    expect(expectedScore(mate(3), "b")).toBe(0);
    expect(expectedScore(mate(-2), "b")).toBe(1);
  });

  it("compares best and played continuations from the mover's perspective", () => {
    const quality = compareContinuations(cp(-150), cp(-20), "b");
    expect(quality.centipawnLoss).toBe(130);
    expect(quality.expectedScoreLoss).toBeGreaterThan(0);
    expect(compareContinuations(cp(50), cp(50), "w").expectedScoreLoss).toBe(0);
  });

  it("treats missed forced mate as decisive and does not report cp loss", () => {
    const quality = compareContinuations(mate(2), cp(0), "w");
    expect(quality.expectedScoreLoss).toBeGreaterThan(0.49);
    expect(quality.centipawnLoss).toBeNull();
  });
});

describe("accuracy and report aggregation", () => {
  it("is bounded and decreases with larger outcome loss", () => {
    expect(accuracyFromLoss(0)).toBe(100);
    expect(accuracyFromLoss(0.2)).toBeLessThan(accuracyFromLoss(0.05));
    expect(accuracyFromLoss(1)).toBeGreaterThanOrEqual(0);
    expect(accuracyFromLoss(2)).toBe(0);
  });

  it("excludes opening and forced moves from player accuracy", () => {
    const samples: AccuracySample[] = [
      { color: "w", expectedBeforeWhite: 0.5, expectedAfterWhite: 0.5, accuracy: 100, isBook: false, isForced: false },
      { color: "w", expectedBeforeWhite: 0.5, expectedAfterWhite: 0.1, accuracy: 0, isBook: true, isForced: false },
      { color: "w", expectedBeforeWhite: 0.5, expectedAfterWhite: 0.1, accuracy: 0, isBook: false, isForced: true },
    ];
    expect(aggregateAccuracy(samples, "w")).toBe(100);
  });

  it("keeps an all-forced or all-book report defined", () => {
    const sample: AccuracySample = {
      color: "b",
      expectedBeforeWhite: 0.5,
      expectedAfterWhite: 0.5,
      accuracy: 100,
      isBook: false,
      isForced: true,
    };
    expect(aggregateAccuracy([sample], "b")).toBe(100);
  });

  it("derives reports and critical moments from the stored move records", () => {
    const makeMove = (overrides: Partial<AnalyzedMove>): AnalyzedMove => ({
      moveNumber: 1,
      ply: 0,
      san: "e4",
      from: "e2",
      to: "e4",
      color: "w",
      fenBefore: "start",
      fenAfter: "after",
      bestMoveUci: "e2e4",
      bestMoveSan: "e4",
      evaluationBefore: cp(50),
      evaluationBestContinuation: cp(50),
      evaluationPlayedContinuation: cp(50),
      evalBefore: cp(50),
      evalAfter: cp(50),
      centipawnLoss: 0,
      bestExpectedScore: 0.55,
      playedExpectedScore: 0.55,
      expectedScoreLoss: 0,
      loss: 0,
      accuracy: 100,
      classification: "best",
      openingName: null,
      explanation: "best",
      isForced: false,
      isBookMove: false,
      ...overrides,
    });
    const moves = [
      makeMove({ color: "w", accuracy: 92, centipawnLoss: 25, expectedScoreLoss: 0.02 }),
      makeMove({
        color: "b",
        ply: 1,
        san: "Qh4",
        accuracy: 30,
        centipawnLoss: 250,
        expectedScoreLoss: 0.35,
        classification: "blunder",
      }),
      makeMove({ ply: 2, isForced: true, classification: "forced", centipawnLoss: null }),
      makeMove({ ply: 3, isBookMove: true, classification: "book", centipawnLoss: null }),
    ];

    const report = buildGameAnalysisResult(moves, 1, "1-0", "test-game");
    expect(report.whiteReport.totalMoves).toBe(3);
    expect(report.whiteReport.counts.forced).toBe(1);
    expect(report.blackReport.counts.blunder).toBe(1);
    expect(report.blackReport.averageCentipawnLoss).toBe(250);
    expect(report.criticalMoments).toContain(1);

    const worseRecords = moves.map((move) =>
      move.color === "w" && !move.isForced ? { ...move, accuracy: 20 } : move,
    );
    expect(buildGameAnalysisResult(worseRecords, 1, "1-0", "test-game").whiteAccuracy)
      .toBeLessThan(report.whiteAccuracy);
  });
});

describe("chess terminal position recognition", () => {
  it("recognizes checkmate and stalemate without an engine search", () => {
    const checkmate = new Chess("7k/6Q1/6K1/8/8/8/8/8 b - - 0 1");
    const stalemate = new Chess("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1");
    expect(checkmate.isCheckmate()).toBe(true);
    expect(stalemate.isStalemate()).toBe(true);
    expect(terminalEvaluation(checkmate.fen())).toMatchObject({
      scoreType: "mate",
      scoreValue: 0,
    });
    expect(Object.is(toWhitePov(terminalEvaluation(checkmate.fen())!, checkmate.fen()).scoreValue, -0)).toBe(false);
    expect(terminalEvaluation(stalemate.fen())).toMatchObject({
      scoreType: "cp",
      scoreValue: 0,
    });
  });

  it("supports castling, en passant, and promotions through chess.js", () => {
    const castling = new Chess("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1");
    expect(castling.move("O-O")?.san).toBe("O-O");

    const enPassant = new Chess("4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1");
    expect(enPassant.move("exd6")?.flags).toContain("e");

    const promotion = new Chess("7k/P7/8/8/8/8/8/7K w - - 0 1");
    expect(promotion.move({ from: "a7", to: "a8", promotion: "q" })?.promotion).toBe("q");
  });

  it("recognizes repetition draws and loads PGN move history", () => {
    const repeated = new Chess();
    for (const san of ["Nf3", "Nf6", "Ng1", "Ng8", "Nf3", "Nf6", "Ng1", "Ng8"])
      repeated.move(san);
    expect(repeated.isThreefoldRepetition()).toBe(true);
    expect(repeated.isDraw()).toBe(true);

    const imported = new Chess();
    imported.loadPgn("1. e4 e5 2. Nf3 Nc6 1-0");
    expect(imported.history()).toEqual(["e4", "e5", "Nf3", "Nc6"]);
    expect(imported.header().Result).toBe("1-0");
  });
});

describe("live board move updates", () => {
  it("undoes the active move and allows a replacement move in free play", () => {
    useGameStore.getState().resetGame();
    const before = useGameStore.getState().fen;
    expect(useGameStore.getState().movePiece("e2", "e4")).toBe(true);
    const after = useGameStore.getState();
    expect(after.fen).not.toBe(before);
    expect(getPiecesFromBoard(after.chess).some((piece) => piece.square === "e4" && piece.type === "p")).toBe(true);

    after.undoMove();
    expect(useGameStore.getState().viewIndex).toBe(-1);
    expect(useGameStore.getState().moves).toHaveLength(0);
    expect(useGameStore.getState().fen).toBe(before);
    expect(useGameStore.getState().chess.get("e4")).toBeUndefined();
    expect(useGameStore.getState().chess.turn()).toBe("w");

    expect(useGameStore.getState().movePiece("d2", "d4")).toBe(true);
    expect(useGameStore.getState().moves.map((move) => move.san)).toEqual(["d4"]);
    expect(useGameStore.getState().chess.get("d4")?.type).toBe("p");
    expect(useGameStore.getState().chess.turn()).toBe("b");
  });
});
