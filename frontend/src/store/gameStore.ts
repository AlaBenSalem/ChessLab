import { create } from "zustand";
import { Chess } from "chess.js";
import type { Move, Square } from "chess.js";
import { playSound, unlockAudio } from "../lib/sounds";

export type HistoryMove = Move & { moveNumber: number; ply: number };

interface GameState {
  chess: Chess;
  fen: string;
  moves: HistoryMove[];
  viewIndex: number;
  selectedSquare: Square | null;
  legalMoves: Square[];
  lastMove: { from: Square; to: Square } | null;
  /** True after a PGN import until the user plays a new move or restarts. */
  isImported: boolean;
  selectSquare: (square: Square) => void;
  movePiece: (
    from: Square,
    to: Square,
    promotion?: "q" | "r" | "b" | "n",
  ) => boolean;
  resetGame: () => void;
  setViewIndex: (index: number) => void;
  firstMove: () => void;
  previousMove: () => void;
  nextMove: () => void;
  lastMoveInHistory: () => void;
  undoMove: () => void;
  redoMove: () => void;
  loadPgn: (pgn: string) => string | null;
}

const numberMoves = (moves: Move[], startingFen: string): HistoryMove[] => {
  const fields = startingFen.split(" ");
  const startingNumber = Number.parseInt(fields[5] ?? "1", 10) || 1;
  const startsWithBlack = fields[1] === "b";
  moves.forEach((move, index) => {
    Object.assign(move, {
      moveNumber:
        startingNumber + Math.floor((index + (startsWithBlack ? 1 : 0)) / 2),
      ply: index,
    });
  });
  return moves as HistoryMove[];
};

const currentLastMove = (moves: HistoryMove[], viewIndex: number) => {
  const move = moves[viewIndex];
  return move ? { from: move.from, to: move.to } : null;
};

const playMoveSound = (positionAfter: Chess, move: Move) => {
  if (positionAfter.isCheckmate()) playSound("checkmate");
  else if (positionAfter.isDraw() || positionAfter.isStalemate())
    playSound("draw");
  else if (positionAfter.inCheck()) playSound("check");
  else if (move.san.includes("O-O")) playSound("castle");
  else if (move.promotion) playSound("promote");
  else if (move.captured) playSound("capture");
  else playSound("move");
};

const initialGame = () => new Chess();

export const useGameStore = create<GameState>((set, get) => ({
  chess: initialGame(),
  fen: initialGame().fen(),
  moves: [],
  viewIndex: -1,
  selectedSquare: null,
  legalMoves: [],
  lastMove: null,
  isImported: false,

  movePiece: (from, to, promotion = "q") => {
    unlockAudio();
    const { chess, moves, viewIndex } = get();
    if (viewIndex !== moves.length - 1) return false;
    try {
      const move = chess.move({ from, to, promotion });
      if (!move) return false;
      const startFen = chess.header().FEN ?? new Chess().fen();
      const history = numberMoves(chess.history({ verbose: true }), startFen);
      playMoveSound(chess, move);
      set({
        fen: chess.fen(),
        moves: history,
        viewIndex: history.length - 1,
        selectedSquare: null,
        legalMoves: [],
        lastMove: { from: move.from, to: move.to },
        isImported: false,
      });
      return true;
    } catch {
      return false;
    }
  },

  selectSquare: (square) => {
    unlockAudio();
    const { chess, selectedSquare, viewIndex, moves } = get();
    if (viewIndex !== moves.length - 1) return;
    if (selectedSquare === square) {
      set({ selectedSquare: null, legalMoves: [] });
      return;
    }
    if (selectedSquare && get().movePiece(selectedSquare, square)) return;
    const piece = chess.get(square);
    if (piece && piece.color === chess.turn()) {
      playSound("select");
      const legalMoves = chess
        .moves({ square, verbose: true })
        .map((move) => move.to);
      set({ selectedSquare: square, legalMoves });
    } else {
      set({ selectedSquare: null, legalMoves: [] });
    }
  },

  resetGame: () => {
    const chess = new Chess();
    playSound("start");
    set({
      chess,
      fen: chess.fen(),
      moves: [],
      viewIndex: -1,
      selectedSquare: null,
      legalMoves: [],
      lastMove: null,
      isImported: false,
    });
  },

  setViewIndex: (requestedIndex) => {
    const { moves, viewIndex, chess } = get();
    const index = Math.max(-1, Math.min(requestedIndex, moves.length - 1));
    if (index === viewIndex) return;
    if (Math.abs(index - viewIndex) === 1) {
      const stepPly = Math.max(index, viewIndex);
      const stepMove = moves[stepPly];
      if (stepMove) {
        const position = new Chess(chess.header().FEN ?? new Chess().fen());
        for (let ply = 0; ply <= stepPly; ply++) position.move(moves[ply]);
        playMoveSound(position, stepMove);
      }
    }
    set({
      viewIndex: index,
      selectedSquare: null,
      legalMoves: [],
      lastMove: currentLastMove(moves, index),
    });
  },
  firstMove: () => get().setViewIndex(-1),
  previousMove: () => get().setViewIndex(get().viewIndex - 1),
  nextMove: () => get().setViewIndex(get().viewIndex + 1),
  lastMoveInHistory: () => get().setViewIndex(get().moves.length - 1),
  undoMove: () => {
    const { chess } = get();
    if (!chess.undo()) return;
    chess.header("Result", "*");

    // Undo changes the canonical Chess position and truncates its active history.
    // Rebuild the public move list from that history so the next move can branch
    // from this restored position immediately.
    const startFen = chess.header().FEN ?? new Chess().fen();
    const moves = numberMoves(chess.history({ verbose: true }), startFen);
    const viewIndex = moves.length - 1;
    set({
      fen: chess.fen(),
      moves,
      viewIndex,
      selectedSquare: null,
      legalMoves: [],
      lastMove: currentLastMove(moves, viewIndex),
    });
  },
  redoMove: () => get().nextMove(),

  loadPgn: (pgn) => {
    try {
      if (!pgn.trim()) return "Paste a PGN game first.";
      const chess = new Chess();
      chess.loadPgn(pgn);
      const moves = numberMoves(
        chess.history({ verbose: true }),
        chess.header().FEN ?? new Chess().fen(),
      );
      if (!moves.length) return "The PGN contains no moves.";
      const viewIndex = moves.length - 1;
      set({
        chess,
        fen: chess.fen(),
        moves,
        viewIndex,
        selectedSquare: null,
        legalMoves: [],
        lastMove: currentLastMove(moves, viewIndex),
        isImported: true,
      });
      return null;
    } catch (error) {
      return error instanceof Error
        ? error.message
        : "Could not read this PGN.";
    }
  },
}));
