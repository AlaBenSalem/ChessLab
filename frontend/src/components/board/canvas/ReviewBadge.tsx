import type { AnalyzedMove } from "../../../hooks/useGameAnalysis";
import type { RANKS, FILES } from "../../../types/chess";
import { MoveBadge } from "../../badges/MoveBadge";
import { SQUARE_SIZE } from "../helpers";

interface Props {
  move: AnalyzedMove | null;
  displayFiles: readonly string[];
  displayRanks: readonly string[];
}

export function ReviewBadge({ move, displayFiles, displayRanks }: Props) {
  if (!move) return null;
  const fileIndex = displayFiles.indexOf(move.to[0] as (typeof FILES)[number]);
  const rankIndex = displayRanks.indexOf(move.to[1] as (typeof RANKS)[number]);
  return <div role="img" aria-label={`${move.classification} move`} title={move.classification} className="pointer-events-none absolute z-20 flex h-[12.5%] w-[12.5%] items-end justify-end p-0.5" style={{ top: `${rankIndex * SQUARE_SIZE}%`, left: `${fileIndex * SQUARE_SIZE}%` }}><MoveBadge kind={move.classification} size="board" /></div>;
}
