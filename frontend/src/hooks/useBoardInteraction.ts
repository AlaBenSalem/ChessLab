import { useRef, useState } from "react";
import type { Color, Square } from "chess.js";
import type { Chess } from "chess.js";

interface Options {
  chess: Chess;
  displayChess: Chess;
  selectedSquare: Square | null;
  legalMoves: Square[];
  canHumanMove: boolean;
  gameOver: boolean;
  isAnalyzing: boolean;
  isThinking: boolean;
  viewingHistory: boolean;
  selectSquare: (square: Square) => void;
  movePiece: (from: Square, to: Square, promotion?: "q" | "r" | "b" | "n") => boolean;
  cancelAnalysis: () => void;
}

export function useBoardInteraction({ chess, displayChess, selectedSquare, legalMoves, canHumanMove, gameOver, isAnalyzing, isThinking, viewingHistory, selectSquare, movePiece, cancelAnalysis }: Options) {
  const [promotionRequest, setPromotionRequest] = useState<{ from: Square; to: Square } | null>(null);
  const [dragPreview, setDragPreview] = useState<{ from: Square; x: number; y: number } | null>(null);
  const pointerDrag = useRef<{ pointerId: number; from: Square; startX: number; startY: number; moved: boolean } | null>(null);

  const moveWithPromotion = (from: Square, to: Square) => {
    if (!canHumanMove) return false;
    const candidateMoves = chess.moves({ square: from, verbose: true }).filter((move) => move.to === to);
    if (!candidateMoves.length) return false;
    if (candidateMoves.some((move) => move.promotion)) {
      setPromotionRequest({ from, to });
      return true;
    }
    return movePiece(from, to);
  };

  const onSquareClick = (square: Square) => {
    if (selectedSquare && legalMoves.includes(square)) {
      if (isThinking) cancelAnalysis();
      moveWithPromotion(selectedSquare, square);
    } else selectSquare(square);
  };

  const onPieceClick = (square: Square) => {
    if (selectedSquare && legalMoves.includes(square)) {
      if (isThinking) cancelAnalysis();
      moveWithPromotion(selectedSquare, square);
    }
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLImageElement>, from: Square, pieceColor: Color) => {
    if (gameOver || isAnalyzing || viewingHistory || !canHumanMove || pieceColor !== displayChess.turn()) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerDrag.current = { pointerId: event.pointerId, from, startX: event.clientX, startY: event.clientY, moved: false };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLImageElement>) => {
    const drag = pointerDrag.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (!drag.moved && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 6) return;
    drag.moved = true;
    event.preventDefault();
    setDragPreview({ from: drag.from, x: event.clientX, y: event.clientY });
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLImageElement>) => {
    const drag = pointerDrag.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    pointerDrag.current = null;
    setDragPreview(null);
    if (!drag.moved) {
      selectSquare(drag.from);
      return;
    }
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-square]")?.dataset.square as Square | undefined;
    const legalTarget = target && displayChess.moves({ square: drag.from, verbose: true }).some((move) => move.to === target);
    if (target && legalTarget) {
      if (isThinking) cancelAnalysis();
      moveWithPromotion(drag.from, target);
    } else selectSquare(drag.from);
  };

  const cancelPointer = () => {
    pointerDrag.current = null;
    setDragPreview(null);
  };

  const promote = (from: Square, to: Square, piece: "q" | "r" | "b" | "n") => {
    movePiece(from, to, piece);
    setPromotionRequest(null);
  };

  return { promotionRequest, setPromotionRequest, dragPreview, moveWithPromotion, onSquareClick, onPieceClick, handlePointerDown, handlePointerMove, handlePointerUp, cancelPointer, promote };
}
