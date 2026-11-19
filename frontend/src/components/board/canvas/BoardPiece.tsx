import { motion } from "framer-motion";
import type { Color, PieceSymbol, Square } from "chess.js";
import type { PieceData } from "../../../types/chess";
import { FILES, RANKS } from "../../../types/chess";
import { SQUARE_SIZE } from "../helpers";

interface Props {
  piece: PieceData;
  displayFiles: readonly string[];
  displayRanks: readonly string[];
  isDragging: boolean;
  onPointerDown: (event: React.PointerEvent<HTMLImageElement>, square: Square, color: Color) => void;
  onPointerMove: (event: React.PointerEvent<HTMLImageElement>) => void;
  onPointerUp: (event: React.PointerEvent<HTMLImageElement>) => void;
  onPointerCancel: () => void;
  onClick: (square: Square) => void;
}

const pieceSrc = (color: Color, type: PieceSymbol) => `/pieces/${color}${type.toUpperCase()}.svg`;

export function BoardPiece({ piece, displayFiles, displayRanks, isDragging, onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onClick }: Props) {
  const fileIndex = displayFiles.indexOf(piece.square[0] as (typeof FILES)[number]);
  const rankIndex = displayRanks.indexOf(piece.square[1] as (typeof RANKS)[number]);
  return (
    <motion.div
      key={piece.id}
      layout
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5 }}
      transition={{ type: "spring", stiffness: 600, damping: 35 }}
      className="pointer-events-none absolute z-10 h-[12.5%] w-[12.5%]"
      data-square={piece.square}
      style={{ top: `${rankIndex * SQUARE_SIZE}%`, left: `${fileIndex * SQUARE_SIZE}%` }}
    >
      <img
        src={pieceSrc(piece.color, piece.type)}
        alt={`${piece.color === "w" ? "White" : "Black"} ${piece.type}`}
        className={`pointer-events-auto h-full w-full touch-none select-none p-[4%] ${isDragging ? "opacity-30" : "cursor-grab active:cursor-grabbing"}`}
        draggable={false}
        onPointerDown={(event) => onPointerDown(event, piece.square, piece.color)}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onClick={() => onClick(piece.square)}
      />
    </motion.div>
  );
}
