import { useMemo, type RefObject } from "react";
import { Clock } from "lucide-react";
import type { AnalyzedMove } from "../../../hooks/useGameAnalysis";
import type { HistoryMove } from "../../../store/gameStore";
import type { MoveClass } from "../../../lib/moveClasses";
import { MoveBadge } from "../../badges/MoveBadge";
import { PANEL } from "../styles";

interface Props {
  moves: HistoryMove[];
  currentIndex: number;
  openingLabel: string;
  reviewMoves?: AnalyzedMove[];
  listRef: RefObject<HTMLDivElement | null>;
  onSelect: (ply: number) => void;
}

export function MoveList({ moves, currentIndex, openingLabel, reviewMoves, listRef, onSelect }: Props) {
  const pairs = useMemo(() => {
    const rows: { number: number; white: number; black: number | null }[] = [];
    for (let ply = 0; ply < moves.length; ply += 2) rows.push({ number: ply / 2 + 1, white: ply, black: ply + 1 < moves.length ? ply + 1 : null });
    return rows;
  }, [moves.length]);

  const renderMoveCell = (ply: number) => {
    const active = ply === currentIndex;
    const classification = reviewMoves?.[ply]?.classification as MoveClass | undefined;
    return <button type="button" data-active={active} onClick={() => onSelect(ply)} className={`flex h-10 items-center gap-2 rounded-md px-3 text-left text-[17px] font-semibold transition-colors ${active ? "bg-white/20 text-white" : "text-stone-200 hover:bg-white/10"}`}><span>{moves[ply].san}</span>{classification && <MoveBadge kind={classification} size="list" />}</button>;
  };

  return <section className={`${PANEL} flex h-[360px] min-h-0 flex-col overflow-hidden lg:h-auto lg:flex-1`}><header className="flex shrink-0 items-center gap-2 border-b border-white/5 px-4 py-3.5"><Clock size={18} className="shrink-0 text-stone-400" /><h2 className="truncate text-[15px] font-bold text-stone-100" title={openingLabel}>{openingLabel}</h2></header><div ref={listRef} className="relative min-h-0 flex-1 overflow-y-auto px-2 py-2">{pairs.length === 0 ? <p className="px-3 py-6 text-center text-[15px] text-stone-500">Make a move or import a PGN to begin.</p> : pairs.map((row) => <div key={row.number} className={`grid grid-cols-[2.75rem_1fr_1fr] items-center rounded-md ${row.number % 2 === 0 ? "bg-white/[0.03]" : ""}`}><span className="pl-3 text-[15px] font-semibold text-stone-500">{row.number}.</span>{renderMoveCell(row.white)}{row.black !== null ? renderMoveCell(row.black) : <span />}</div>)}</div></section>;
}
