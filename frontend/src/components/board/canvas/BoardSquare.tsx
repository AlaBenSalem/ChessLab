import { motion } from "framer-motion";
import type { Square } from "chess.js";
import { KING_HIGHLIGHT, SQUARE_SIZE, type KingRole } from "../helpers";

interface Props {
  square: Square;
  rank: string;
  file: string;
  row: number;
  column: number;
  isLight: boolean;
  isSelected: boolean;
  isLegalMove: boolean;
  isCapture: boolean;
  isLastMove: boolean;
  kingRole?: KingRole;
  disabled: boolean;
  onClick: () => void;
}

export function BoardSquare({ square, rank, file, row, column, isLight, isSelected, isLegalMove, isCapture, isLastMove, kingRole, disabled, onClick }: Props) {
  let bgColor = isLight ? "bg-[#efefef]" : "bg-[#b8b8b8]";
  if (isLastMove) bgColor = isLight ? "bg-[#cfe3ee]" : "bg-[#9cb6c6]";
  if (isSelected) bgColor = isLight ? "bg-[#c4e0a6]" : "bg-[#86b86b]";

  return (
    <button
      type="button"
      role="gridcell"
      aria-label={square}
      data-square={square}
      disabled={disabled}
      onClick={onClick}
      className={`absolute h-[12.5%] w-[12.5%] ${bgColor} ${disabled ? "cursor-default" : "cursor-pointer"} focus-visible:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-emerald-500`}
      style={{ top: `${row * SQUARE_SIZE}%`, left: `${column * SQUARE_SIZE}%` }}
    >
      {column === 0 && <span className={`absolute left-1 top-0.5 text-xs font-bold leading-none sm:text-sm ${isLight ? "text-[#9a9a9a]" : "text-[#f2f2f2]"}`}>{rank}</span>}
      {row === 7 && <span className={`absolute bottom-0.5 right-1 text-xs font-bold leading-none sm:text-sm ${isLight ? "text-[#9a9a9a]" : "text-[#f2f2f2]"}`}>{file}</span>}
      {kingRole && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="pointer-events-none absolute inset-0" style={{ background: KING_HIGHLIGHT[kingRole] }} />}
      {isLegalMove && <div className="pointer-events-none absolute inset-0 flex items-center justify-center">{isCapture ? <div className="h-[85%] w-[85%] rounded-full border-[4px] border-black/25" /> : <div className="h-[30%] w-[30%] rounded-full bg-black/20" />}</div>}
    </button>
  );
}
