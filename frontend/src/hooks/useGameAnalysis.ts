import { useCallback, useEffect, useRef, useState } from "react";
import { Chess } from "chess.js";
import type { Square } from "chess.js";
import { getStockfishEngine } from "../engine/engineManager";
import type { StockfishEngine } from "../engine/StockfishEngine";
import type { EngineEvaluation } from "../engine/StockfishEngine";
import {
  accuracyFromLoss,
  aggregateAccuracy,
  compareContinuations,
  expectedScore,
  toWhitePov,
  type AccuracySample,
} from "../lib/accuracy";
import {
  loadOpeningBook,
  isBookMove,
  getOpeningName,
} from "../lib/openingBook";
import { classifyMove, REVIEW_THRESHOLDS, type Classification } from "../lib/classification";

export interface AnalyzedMove {
  moveNumber: number;
  ply: number;
  san: string;
  from: Square;
  to: Square;
  promotion?: string;
  color: "w" | "b";
  fenBefore: string;
  fenAfter: string;
  bestMoveUci: string | null;
  bestMoveSan: string | null;
  evaluationBefore: EngineEvaluation | null;
  evaluationBestContinuation: EngineEvaluation | null;
  evaluationPlayedContinuation: EngineEvaluation | null;
  evalBefore: EngineEvaluation | null;
  evalAfter: EngineEvaluation | null;
  centipawnLoss: number | null;
  bestExpectedScore: number | null;
  playedExpectedScore: number | null;
  expectedScoreLoss: number;
  /** Kept for existing consumers; this is expected-score loss in 0..1. */
  loss: number;
  accuracy: number;
  classification: Classification;
  openingName: string | null;
  explanation: string;
  isForced: boolean;
  isBookMove: boolean;
}

export interface PlayerAccuracyReport {
  accuracy: number;
  totalMoves: number;
  counts: Record<Classification, number>;
  missedWins: number;
  averageCentipawnLoss: number;
}

export interface GameAnalysisResult {
  gameKey: string;
  moves: AnalyzedMove[];
  whiteAccuracy: number;
  blackAccuracy: number;
  bookMoves: number;
  whiteReport: PlayerAccuracyReport;
  blackReport: PlayerAccuracyReport;
  gameResult: string;
  openingName: string | null;
  criticalMoments: number[];
}

export interface GameAnalysis {
  evalResult: EngineEvaluation | null;
  isThinking: boolean;
  isAnalyzing: boolean;
  progress: number;
  busy: boolean;
  error: string | null;
  gameSummary: {
    white: number;
    black: number;
    whiteMoves: number;
    blackMoves: number;
    bookMoves: number;
  } | null;
  result: GameAnalysisResult | null;
  analyzePosition: () => Promise<void>;
  analyzeGame: () => Promise<void>;
  cancelAnalysis: () => void;
}

const EMPTY_COUNTS = (): Record<Classification, number> => ({
  brilliant: 0,
  great: 0,
  best: 0,
  excellent: 0,
  good: 0,
  book: 0,
  inaccuracy: 0,
  miss: 0,
  mistake: 0,
  blunder: 0,
  forced: 0,
});

function moveFromUci(chess: Chess, uci: string | null) {
  if (!uci || uci.length < 4) return null;
  try {
    return chess.move({
      from: uci.slice(0, 2) as Square,
      to: uci.slice(2, 4) as Square,
      promotion: uci[4],
    });
  } catch {
    return null;
  }
}

const PIECE_VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

function isMaterialSacrifice(fen: string, pv: string[], color: "w" | "b"): boolean {
  const afterBestMove = new Chess(fen);
  const bestMove = pv[0];
  if (bestMove && moveFromUci(afterBestMove, bestMove)) {
    const canCaptureOfferedPiece = afterBestMove.moves({ verbose: true }).some((move) =>
      move.to === bestMove.slice(2, 4) &&
      move.captured !== undefined &&
      PIECE_VALUE[move.captured] >= 2,
    );
    if (canCaptureOfferedPiece) return true;
  }

  const position = new Chess(fen);
  const materialForMover = () => position.board().flat().reduce((total, piece) => {
    if (!piece) return total;
    return total + (piece.color === color ? 1 : -1) * PIECE_VALUE[piece.type];
  }, 0);
  const startingMaterial = materialForMover();
  let lowestMaterial = startingMaterial;

  for (const uci of pv.slice(0, 5)) {
    if (!moveFromUci(position, uci)) break;
    lowestMaterial = Math.min(lowestMaterial, materialForMover());
  }

  // Track the largest temporary material deficit: a sacrifice may be followed
  // by a recapture or promotion later in the principal variation.
  return startingMaterial - lowestMaterial >= 2;
}

function reportFor(
  color: "w" | "b",
  moves: AnalyzedMove[],
  accuracy: number,
): PlayerAccuracyReport {
  const playerMoves = moves.filter((move) => move.color === color);
  const counts = EMPTY_COUNTS();
  for (const move of playerMoves) counts[move.classification]++;
  const cpl = playerMoves
    .filter((move) => !move.isBookMove && !move.isForced)
    .map((move) => move.centipawnLoss)
    .filter((value): value is number => value !== null);
  return {
    accuracy,
    totalMoves: playerMoves.length,
    counts,
    missedWins: counts.miss,
    averageCentipawnLoss: cpl.length
      ? cpl.reduce((sum, value) => sum + value, 0) / cpl.length
      : 0,
  };
}

/** Deterministically derive every game statistic from the move records. */
export function buildGameAnalysisResult(
  moves: AnalyzedMove[],
  bookMoves: number,
  gameResult: string,
  gameKey: string,
): GameAnalysisResult {
  const samples: AccuracySample[] = moves.flatMap((move) => {
    if (
      move.isBookMove ||
      move.isForced ||
      !move.evaluationBefore ||
      !move.evalAfter
    ) return [];
    return [{
      color: move.color,
      expectedBeforeWhite: expectedScore(toWhitePov(move.evaluationBefore, move.fenBefore), "w"),
      expectedAfterWhite: expectedScore(toWhitePov(move.evalAfter, move.fenAfter), "w"),
      accuracy: move.accuracy,
      isBook: false,
      isForced: false,
    }];
  });
  const whiteAccuracy = aggregateAccuracy(samples, "w");
  const blackAccuracy = aggregateAccuracy(samples, "b");
  return {
    moves,
    gameKey,
    whiteAccuracy,
    blackAccuracy,
    bookMoves,
    whiteReport: reportFor("w", moves, whiteAccuracy),
    blackReport: reportFor("b", moves, blackAccuracy),
    gameResult,
    openingName: moves.find((move) => move.openingName)?.openingName ?? null,
    criticalMoments: moves
      .filter((move) => move.expectedScoreLoss >= 0.1 || ["miss", "mistake", "blunder"].includes(move.classification))
      .map((move) => move.ply),
  };
}

export function useGameAnalysis(chess: Chess, displayFen: string): GameAnalysis {
  const [result, setResult] = useState<GameAnalysisResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [isThinking, setIsThinking] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [singleEval, setSingleEval] = useState<{
    fen: string;
    evaluation: EngineEvaluation;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const engineRef = useRef<StockfishEngine | null>(null);
  const evaluationCacheRef = useRef<Map<string, Map<string, EngineEvaluation>>>(new Map());
  const runIdRef = useRef(0);

  const getEngine = () => {
    if (!engineRef.current) engineRef.current = getStockfishEngine();
    return engineRef.current;
  };

  const cancelAnalysis = useCallback(() => {
    runIdRef.current++;
    engineRef.current?.cancelCurrent();
    setIsAnalyzing(false);
    setIsThinking(false);
  }, []);

  useEffect(() => () => {
    runIdRef.current++;
    engineRef.current?.cancelCurrent();
    engineRef.current = null;
  }, []);

  const currentHistory = chess.history({ verbose: true });
  const currentStartFen = chess.header().FEN ?? new Chess().fen();
  const currentGameKey = `${currentStartFen}|${currentHistory
    .map((move) => `${move.from}${move.to}${move.promotion ?? ""}`)
    .join(" ")}`;
  const currentResult = result?.gameKey === currentGameKey ? result : null;

  const analyzePosition = async () => {
    const runId = ++runIdRef.current;
    setError(null);
    setIsThinking(true);
    try {
      const engine = getEngine();
      await engine.init();
      if (runId !== runIdRef.current) return;
      const fenCache = evaluationCacheRef.current.get(displayFen) ?? new Map<string, EngineEvaluation>();
      evaluationCacheRef.current.set(displayFen, fenCache);
      const cacheKey = "depth:15";
      const evaluation = fenCache.get(cacheKey) ?? await engine.evaluate(displayFen, 15);
      fenCache.set(cacheKey, evaluation);
      if (runId === runIdRef.current) setSingleEval({ fen: displayFen, evaluation });
    } catch (cause) {
      if (runId === runIdRef.current) {
        setError(cause instanceof Error ? cause.message : String(cause));
      }
    } finally {
      if (runId === runIdRef.current) setIsThinking(false);
    }
  };

  const analyzeGame = async () => {
    const runId = ++runIdRef.current;
    const verboseMoves = chess.history({ verbose: true });
    if (!verboseMoves.length) {
      setError("Play or import a game before analyzing it.");
      return;
    }

    setError(null);
    setProgress(0);
    setResult(null);
    setIsAnalyzing(true);
    let engine: StockfishEngine | null = null;
    try {
      await loadOpeningBook();
      engine = getEngine();
      await engine.init();

      const startingFen = currentStartFen;
      const replay = new Chess(startingFen);
      const moves: AnalyzedMove[] = [];
      const search = async (fen: string, searchMove?: string) => {
        const fenCache = evaluationCacheRef.current.get(fen) ?? new Map<string, EngineEvaluation>();
        evaluationCacheRef.current.set(fen, fenCache);
        const key = `nodes:180000|${searchMove ?? "best"}`;
        const cached = fenCache.get(key);
        if (cached) return cached;
        const evaluation = await engine!.evaluate(fen, 14, {
          nodes: 180_000,
          searchMove,
        });
        fenCache.set(key, evaluation);
        return evaluation;
      };
      let bookMoves = 0;

      for (let index = 0; index < verboseMoves.length; index++) {
        if (runId !== runIdRef.current) throw new DOMException("Aborted", "AbortError");
        const played = verboseMoves[index];
        const fenBefore = replay.fen();
        const color = played.color;
        const legalMoves = replay.moves({ verbose: true });
        const forced = legalMoves.length === 1;
        const book = isBookMove(fenBefore, played.san);
        const openingName = getOpeningName(fenBefore);
        const playedUci = `${played.from}${played.to}${played.promotion ?? ""}`;
        const bestEval = await search(fenBefore);
        if (moves.length) moves[moves.length - 1].evalAfter = bestEval;
        const bestSan = moveFromUci(new Chess(fenBefore), bestEval.bestMove)?.san ?? null;
        const base: AnalyzedMove = {
          moveNumber: Number.parseInt(fenBefore.split(" ")[5] ?? "1", 10) || 1,
          ply: index,
          san: played.san,
          from: played.from,
          to: played.to,
          promotion: played.promotion,
          color,
          fenBefore,
          fenAfter: "",
          bestMoveUci: bestEval.bestMove,
          bestMoveSan: bestSan,
          evaluationBefore: bestEval,
          evaluationBestContinuation: bestEval,
          evaluationPlayedContinuation: null,
          evalBefore: bestEval,
          evalAfter: null,
          centipawnLoss: null,
          bestExpectedScore: null,
          playedExpectedScore: null,
          expectedScoreLoss: 0,
          loss: 0,
          accuracy: 100,
          classification: book ? "book" : forced ? "forced" : "good",
          openingName,
          explanation: book
            ? `Recognized opening move${openingName ? ` in ${openingName}` : ""}.`
            : forced
              ? "Only one legal move was available."
              : "",
          isForced: forced,
          isBookMove: book,
        };

        if (book) {
          bookMoves++;
          replay.move(played.san);
          base.fenAfter = replay.fen();
          moves.push(base);
          setProgress(Math.round(((index + 1) / verboseMoves.length) * 100));
          continue;
        }

        const playedEval = forced || bestEval.bestMove === playedUci
          ? bestEval
          : await search(fenBefore, playedUci);
        const whiteBestEval = toWhitePov(bestEval, fenBefore);
        const whitePlayedEval = toWhitePov(playedEval, fenBefore);
        const quality = compareContinuations(whiteBestEval, whitePlayedEval, color);
        const { bestExpectedScore: bestOutcome, playedExpectedScore: playedOutcome } = quality;
        const qualityLoss = quality.expectedScoreLoss;
        const cpLoss = quality.centipawnLoss;
        const accuracy = forced ? 100 : accuracyFromLoss(qualityLoss);

        const bestMateForMover = whiteBestEval.scoreType === "mate"
          ? color === "w" ? whiteBestEval.scoreValue : -whiteBestEval.scoreValue
          : null;
        const playedMateForMover = whitePlayedEval.scoreType === "mate"
          ? color === "w" ? whitePlayedEval.scoreValue : -whitePlayedEval.scoreValue
          : null;
        const missedMate = bestMateForMover !== null && bestMateForMover > 0 &&
          (playedMateForMover === null || playedMateForMover <= 0);
        const isMiss = (bestOutcome >= 0.75 && playedOutcome < 0.5) || missedMate;
        // Approximate Chess.com's Brilliant criteria: the played move must be
        // Stockfish's best line and involve a sound material sacrifice. This
        // intentionally avoids extra win-probability or MultiPV-gap gates,
        // which can hide legitimate sacrifices.
        const isBrilliant = !forced && bestEval.bestMove === playedUci &&
          bestOutcome >= REVIEW_THRESHOLDS.brilliantEqualOrBetter &&
          bestOutcome <= REVIEW_THRESHOLDS.brilliantNotAlreadyWinning &&
          isMaterialSacrifice(fenBefore, bestEval.lines[0]?.pv ?? [], color);
        const classification = forced ? "forced" : classifyMove({
          loss: qualityLoss,
          isBook: false,
          isBrilliant,
          isBestMove: bestEval.bestMove === playedUci,
          isMiss,
        });

        replay.move(played.san);
        base.fenAfter = replay.fen();
        base.bestMoveUci = bestEval.bestMove;
        base.bestMoveSan = bestSan;
        base.evaluationBefore = bestEval;
        base.evaluationBestContinuation = bestEval;
        base.evaluationPlayedContinuation = playedEval;
        base.evalBefore = bestEval;
        base.evalAfter = null;
        base.centipawnLoss = cpLoss;
        base.bestExpectedScore = bestOutcome;
        base.playedExpectedScore = playedOutcome;
        base.expectedScoreLoss = qualityLoss;
        base.loss = qualityLoss;
        base.accuracy = accuracy;
        base.classification = classification;
        base.explanation = forced
          ? "Only one legal move was available."
          : isBrilliant
            ? "A sound material sacrifice was Stockfish's best move."
            : bestEval.bestMove === playedUci
              ? "The played move matched Stockfish's top move."
              : isMiss
                ? missedMate
                  ? "A forced mating continuation was missed."
                  : "A winning opportunity was missed."
                : `The move gave up ${(qualityLoss * 100).toFixed(1)} expected-score points versus the best line.`;
        moves.push(base);
        setProgress(Math.round(((index + 1) / verboseMoves.length) * 100));
      }

      if (moves.length) {
        const finalEval: EngineEvaluation = replay.isCheckmate()
          ? {
              depth: 0,
              scoreType: "mate",
              scoreValue: 0,
              bestMove: "",
          lines: [],
            }
          : replay.isDraw() || replay.isStalemate()
            ? { depth: 0, scoreType: "cp", scoreValue: 0, bestMove: "", lines: [] }
            : await search(replay.fen());
        moves[moves.length - 1].evalAfter = finalEval;
      }

      if (runId === runIdRef.current) {
        const headers = chess.header();
        const gameResult = headers.Result && headers.Result !== "*"
          ? headers.Result
          : replay.isCheckmate()
            ? replay.turn() === "w" ? "0-1" : "1-0"
            : replay.isDraw() || replay.isStalemate()
              ? "1/2-1/2"
              : "*";
        setResult(buildGameAnalysisResult(moves, bookMoves, gameResult, currentGameKey));
      }
    } catch (cause) {
      if (runId === runIdRef.current && !(cause instanceof DOMException && cause.name === "AbortError")) {
        setError(cause instanceof Error ? cause.message : String(cause));
      }
    } finally {
      if (runId === runIdRef.current) setIsAnalyzing(false);
    }
  };

  return {
    evalResult: singleEval?.fen === displayFen ? singleEval.evaluation : null,
    isThinking,
    isAnalyzing,
    progress,
    busy: isThinking || isAnalyzing,
    error,
    gameSummary: currentResult
      ? {
          white: currentResult.whiteAccuracy,
          black: currentResult.blackAccuracy,
          whiteMoves: currentResult.whiteReport.totalMoves,
          blackMoves: currentResult.blackReport.totalMoves,
          bookMoves: currentResult.bookMoves,
        }
      : null,
    result: currentResult,
    analyzePosition,
    analyzeGame,
    cancelAnalysis,
  };
}
