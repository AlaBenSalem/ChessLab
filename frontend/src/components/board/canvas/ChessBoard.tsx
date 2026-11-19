import type { Color, Square } from "chess.js";
import { Chess } from "chess.js";
import { AnimatePresence } from "framer-motion";
import type { AnalyzedMove } from "../../../hooks/useGameAnalysis";
import type { PieceData } from "../../../types/chess";
import { FILES, RANKS } from "../../../types/chess";
import type { HistoryMove } from "../../../store/gameStore";
import type { KingRole } from "../helpers";
import { BestMoveArrows, type BestMoveArrow } from "./BestMoveArrows";
import { BoardPiece } from "./BoardPiece";
import { BoardSquare } from "./BoardSquare";
import { CheckmateLabels } from "./CheckmateLabels";
import { DragGhost } from "./DragGhost";
import { ReviewBadge } from "./ReviewBadge";

interface Props {
  chess: Chess;
  displayFiles: readonly (typeof FILES)[number][] | readonly string[];
  displayRanks: readonly (typeof RANKS)[number][] | readonly string[];
  pieces: PieceData[];
  selectedSquare: Square | null;
  legalMoves: Square[];
  lastMove: HistoryMove | null;
  kingRoles: Map<Square, KingRole>;
  gameOver: boolean;
  computerGameOver: boolean;
  isAnalyzing: boolean;
  viewingHistory: boolean;
  canHumanMove: boolean;
  currentReviewMove: AnalyzedMove | null;
  arrows: BestMoveArrow[];
  dragPreview: { from: Square; x: number; y: number } | null;
  isCheckmate: boolean;
  onSquareClick: (square: Square) => void;
  onPieceClick: (square: Square) => void;
  onPointerDown: (event: React.PointerEvent<HTMLImageElement>, square: Square, color: Color) => void;
  onPointerMove: (event: React.PointerEvent<HTMLImageElement>) => void;
  onPointerUp: (event: React.PointerEvent<HTMLImageElement>) => void;
  onPointerCancel: () => void;
}

export function ChessBoard({ chess, displayFiles, displayRanks, pieces, selectedSquare, legalMoves, lastMove, kingRoles, gameOver, computerGameOver, isAnalyzing, viewingHistory, canHumanMove, currentReviewMove, arrows, dragPreview, isCheckmate, onSquareClick, onPieceClick, onPointerDown, onPointerMove, onPointerUp, onPointerCancel }: Props) {
  return (
    <div className="relative h-full w-full" role="grid" aria-label="Chess board">
      {displayRanks.map((rank, row) => displayFiles.map((file, column) => {
        const square = `${file}${rank}` as Square;
        const isLight = (row + column) % 2 === 0;
        const isSelected = !viewingHistory && selectedSquare === square;
        const isLegalMove = legalMoves.includes(square);
        const isCapture = isLegalMove && chess.get(square) != null;
        const isLastMove = lastMove?.from === square || lastMove?.to === square;
        const locked = gameOver || computerGameOver || isAnalyzing || viewingHistory || !canHumanMove;
        return <BoardSquare key={square} square={square} rank={rank} file={file} row={row} column={column} isLight={isLight} isSelected={isSelected} isLegalMove={isLegalMove} isCapture={isCapture} isLastMove={isLastMove} kingRole={kingRoles.get(square)} disabled={locked} onClick={() => onSquareClick(square)} />;
      }))}

      <AnimatePresence>
        {pieces.map((piece) => <BoardPiece key={piece.id} piece={piece} displayFiles={displayFiles} displayRanks={displayRanks} isDragging={dragPreview?.from === piece.square} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerCancel} onClick={onPieceClick} />)}
      </AnimatePresence>

      <BestMoveArrows arrows={arrows} displayFiles={displayFiles} displayRanks={displayRanks} />
      <ReviewBadge move={currentReviewMove} displayFiles={displayFiles} displayRanks={displayRanks} />
      <DragGhost preview={dragPreview} piece={pieces.find((piece) => piece.square === dragPreview?.from)} />
      <CheckmateLabels isCheckmate={isCheckmate} kingRoles={kingRoles} displayFiles={displayFiles} displayRanks={displayRanks} />
    </div>
  );
}
