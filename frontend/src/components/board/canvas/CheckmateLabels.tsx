import { AnimatePresence, motion } from "framer-motion";
import type { Square } from "chess.js";
import { FILES, RANKS } from "../../../types/chess";
import type { KingRole } from "../helpers";
import { SQUARE_SIZE } from "../helpers";

interface Props {
  isCheckmate: boolean;
  kingRoles: Map<Square, KingRole>;
  displayFiles: readonly string[];
  displayRanks: readonly string[];
}

export function CheckmateLabels({ isCheckmate, kingRoles, displayFiles, displayRanks }: Props) {
  return <AnimatePresence>{isCheckmate && Array.from(kingRoles.entries()).map(([square, role]) => {
    if (role === "check") return null;
    const fileIndex = displayFiles.indexOf(square[0] as (typeof FILES)[number]);
    const rankIndex = displayRanks.indexOf(square[1] as (typeof RANKS)[number]);
    const isLoser = role === "loser";
    const placeBelow = rankIndex === 0;
    return <motion.div key={`label-${square}`} initial={{ opacity: 0, y: placeBelow ? -6 : 6, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} transition={{ type: "spring", stiffness: 400, damping: 22, delay: 0.25 }} className="pointer-events-none absolute z-30 flex h-[12.5%] w-[12.5%] justify-center" style={{ top: `${rankIndex * SQUARE_SIZE}%`, left: `${fileIndex * SQUARE_SIZE}%` }}>
      <span className={`absolute whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-extrabold tracking-wide text-white shadow-lg ring-2 ring-white/80 sm:text-sm ${isLoser ? "bg-red-600" : "bg-blue-600"} ${placeBelow ? "top-full mt-1" : "bottom-full mb-1"}`}>{isLoser ? "Checkmate" : "Winner"}</span>
    </motion.div>;
  })}</AnimatePresence>;
}
