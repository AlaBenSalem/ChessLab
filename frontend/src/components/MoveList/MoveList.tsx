import { memo, useEffect, useMemo, useRef } from "react";
import type { HistoryMove } from "../../store/gameStore";
import type { AnalyzedMove } from "../../hooks/useGameAnalysis";
import type { Classification } from "../../lib/classification";
import { MoveRow } from "./MoveRow";

interface Props {
  moves: HistoryMove[];
  currentPly: number;
  result: string;
  onMoveClick: (ply: number) => void;
  reviewMoves?: AnalyzedMove[] | null;
}

interface MovePair {
  number: number;
  white?: HistoryMove;
  black?: HistoryMove;
}

const MemoMovePair = memo(function MemoMovePair({ pair, currentPly, onMoveClick, currentRef, classifications }: {
  pair: MovePair;
  currentPly: number;
  onMoveClick: (ply: number) => void;
  currentRef: React.RefObject<HTMLButtonElement | null>;
  classifications: Map<number, Classification>;
}) {
  const whitePly = pair.white?.ply ?? -1;
  const blackPly = pair.black?.ply ?? -1;
  return (
    <div className="grid grid-cols-[2rem_1fr_1fr] items-center gap-x-2 border-b border-amber-100/5 text-sm">
      <span className="px-2 text-stone-500">{pair.number}.</span>
      <MoveRow move={pair.white} ply={whitePly} isCurrent={whitePly === currentPly} onClick={onMoveClick} buttonRef={whitePly === currentPly ? currentRef : undefined} classification={classifications.get(whitePly)} />
      <MoveRow move={pair.black} ply={blackPly} isCurrent={blackPly === currentPly} onClick={onMoveClick} buttonRef={blackPly === currentPly ? currentRef : undefined} classification={classifications.get(blackPly)} />
    </div>
  );
});

export function MoveList({ moves, currentPly, result, onMoveClick, reviewMoves }: Props) {
  const currentRef = useRef<HTMLButtonElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const pairs = useMemo(() => {
    const grouped = new Map<number, MovePair>();
    moves.forEach((move) => {
      const number = move.moveNumber;
      const pair: MovePair = grouped.get(number) ?? { number };
      if (move.color === "w") pair.white = move;
      else pair.black = move;
      grouped.set(number, pair);
    });
    return Array.from(grouped.values());
  }, [moves]);
  const classifications = useMemo(
    () => new Map((reviewMoves ?? []).map((move) => [move.ply, move.classification])),
    [reviewMoves],
  );

  useEffect(() => {
    const scroller = scrollRef.current;
    const current = currentRef.current;
    if (!scroller || !current) return;
    const viewport = scroller.getBoundingClientRect();
    const row = current.getBoundingClientRect();
    const stickyHeaderHeight = 32;
    if (row.top < viewport.top + stickyHeaderHeight) {
      scroller.scrollTop -= viewport.top + stickyHeaderHeight - row.top;
    } else if (row.bottom > viewport.bottom) {
      scroller.scrollTop += row.bottom - viewport.bottom;
    }
  }, [currentPly]);

  return (
    <div className="flex min-h-64 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-amber-100/10 bg-black/25">
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="sticky top-0 z-10 grid h-8 grid-cols-[2rem_minmax(0,1fr)_minmax(0,1fr)] gap-x-2 border-b border-amber-100/10 bg-stone-950/95 px-2 text-xs font-semibold uppercase tracking-wide text-stone-500 backdrop-blur">
          <span className="self-center">#</span><span className="self-center">White</span><span className="self-center">Black</span>
        </div>
        <div className="px-1.5">
        {pairs.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-stone-400">No moves yet</p>
        ) : (
          <>
            {pairs.map((pair) => (
              <MemoMovePair
                key={pair.number}
                pair={pair}
                currentPly={currentPly}
                onMoveClick={onMoveClick}
                currentRef={currentRef}
                classifications={classifications}
              />
            ))}
            {result !== "*" && <p className="px-2 py-2 text-center text-sm font-bold text-amber-200">{result}</p>}
          </>
        )}
        </div>
      </div>
    </div>
  );
}
