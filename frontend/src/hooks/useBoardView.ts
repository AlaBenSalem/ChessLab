import { useMemo } from "react";
import { Chess } from "chess.js";
import type { Color, PieceSymbol, Square } from "chess.js";
import type { EngineEvaluation } from "../engine/StockfishEngine";
import type { GameAnalysisResult } from "./useGameAnalysis";
import type { HistoryMove } from "../store/gameStore";
import { toWhitePov } from "../lib/accuracy";
import { findKingSquare, getDrawReason, type KingRole } from "../components/board/helpers";

interface Options {
  chess: Chess;
  moves: HistoryMove[];
  viewIndex: number;
  legalMoves: Square[];
  result: GameAnalysisResult | null;
  analysisEval: EngineEvaluation | null;
  liveEval: EngineEvaluation | null;
  gameResultHeader: string;
  computerMode: boolean;
  computerResult: string;
  computerColor: Color;
  playerColor: Color;
}

export function useBoardView({ chess, moves, viewIndex, legalMoves, result, analysisEval, liveEval, gameResultHeader, computerMode, computerResult, computerColor, playerColor }: Options) {
  const activePly = viewIndex;
  const viewingHistory = viewIndex < moves.length - 1;
  const displayChess = useMemo(() => {
    const position = new Chess(chess.header().FEN ?? new Chess().fen());
    for (let index = 0; index <= viewIndex; index++) position.move(moves[index]);
    return position;
  }, [chess, moves, viewIndex]);
  const displayFen = displayChess.fen();
  const displayLastMove = viewIndex >= 0 ? (moves[viewIndex] ?? null) : null;
  const displayLegalMoves = viewingHistory ? [] : legalMoves;
  const capturedBy = useMemo(() => {
    const captures: Record<Color, { color: Color; type: PieceSymbol }[]> = { w: [], b: [] };
    moves.slice(0, viewIndex + 1).forEach((move) => {
      if (!move.captured) return;
      const capturedColor: Color = move.color === "w" ? "b" : "w";
      captures[move.color].push({ color: capturedColor, type: move.captured });
    });
    return captures;
  }, [moves, viewIndex]);
  const materialDifference = displayChess.board().flat().reduce((difference, piece) => {
    if (!piece || piece.type === "k") return difference;
    const value = piece.type === "q" ? 9 : piece.type === "r" ? 5 : piece.type === "b" || piece.type === "n" ? 3 : 1;
    return difference + (piece.color === "w" ? value : -value);
  }, 0);
  const currentEval = useMemo(() => {
    if (viewingHistory) return result?.moves[activePly]?.evalAfter ?? null;
    return analysisEval ?? liveEval;
  }, [analysisEval, result, activePly, liveEval, viewingHistory]);
  const whitePovEval = currentEval ? toWhitePov(currentEval, displayFen) : null;
  const bestMoveArrows = useMemo(() => {
    if (viewingHistory || !analysisEval) return [];
    const candidates = [analysisEval.bestMove, ...analysisEval.lines.map((line) => line.move)];
    const uniqueMoves = Array.from(new Set(candidates.filter((move) => move.length >= 4))).slice(0, 3);
    return uniqueMoves.map((uci) => ({ from: uci.slice(0, 2) as Square, to: uci.slice(2, 4) as Square }));
  }, [analysisEval, viewingHistory]);

  const isCheckmate = displayChess.isCheckmate();
  const isDraw = displayChess.isDraw();
  const gameOver = displayChess.isGameOver();
  const isCheck = displayChess.inCheck();
  const turn = displayChess.turn();
  const loserColor: Color | null = isCheckmate ? turn : null;
  const winnerColor: Color | null = isCheckmate ? (turn === "w" ? "b" : "w") : null;
  const computerWinner: Color | null = computerResult.startsWith("You win")
    ? playerColor
    : computerResult.startsWith("Stockfish wins") ? (computerColor === "w" ? "b" : "w") : null;
  const isComputerGameOver = computerMode && (Boolean(computerResult) || gameOver);
  const statusText = computerResult ? computerResult : gameOver
    ? isCheckmate ? `Checkmate – ${winnerColor === "w" ? "White" : "Black"} wins`
      : isDraw ? `Draw – ${getDrawReason(displayChess)}` : "Game over"
    : `${turn === "w" ? "White" : "Black"} to move${isCheck ? " – Check!" : ""}`;
  const kingRoles = useMemo(() => {
    const roles = new Map<Square, KingRole>();
    if (isCheckmate && loserColor && winnerColor) {
      const loserSq = findKingSquare(displayChess, loserColor);
      const winnerSq = findKingSquare(displayChess, winnerColor);
      if (loserSq) roles.set(loserSq, "loser");
      if (winnerSq) roles.set(winnerSq, "winner");
    } else if (isCheck) {
      const sq = findKingSquare(displayChess, turn);
      if (sq) roles.set(sq, "check");
    }
    return roles;
  }, [displayChess, isCheckmate, isCheck, loserColor, winnerColor, turn]);
  const gameResultWinner = viewIndex === moves.length - 1
    ? gameResultHeader === "1-0" ? "w" : gameResultHeader === "0-1" ? "b" : null
    : null;
  const barWinner = computerWinner ?? winnerColor ?? gameResultWinner;

  return {
    activePly, viewingHistory, displayChess, displayFen, displayLastMove, displayLegalMoves,
    capturedBy, materialDifference, currentEval, whitePovEval, bestMoveArrows,
    isCheckmate, isDraw, gameOver, isCheck, turn, loserColor, winnerColor,
    isComputerGameOver, statusText, kingRoles, barWinner,
  };
}
