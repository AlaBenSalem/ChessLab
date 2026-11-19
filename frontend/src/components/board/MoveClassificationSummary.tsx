import type { PlayerAccuracyReport } from "../../hooks/useGameAnalysis";
import { MOVE_CLASS_LIST } from "../../lib/moveClasses";

interface Props {
  white: PlayerAccuracyReport;
  black: PlayerAccuracyReport;
}

/** Completed-game comparison. Counts come from each move's single classification. */
export function MoveClassificationSummary({ white, black }: Props) {
  return (
    <section
      aria-labelledby="move-classification-summary-title"
      className="shrink-0 rounded-xl border border-white/10 bg-black/25 p-3"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3
          id="move-classification-summary-title"
          className="text-xs font-bold uppercase tracking-[0.14em] text-stone-300"
        >
          Move quality
        </h3>
        <span className="text-[11px] font-medium text-stone-500">{white.totalMoves} vs {black.totalMoves} moves</span>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <AccuracyCard label="White" accuracy={white.accuracy} />
        <AccuracyCard label="Black" accuracy={black.accuracy} />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_3.25rem_3.25rem] items-center gap-x-2 gap-y-1.5">
        <span className="pb-1 text-[10px] font-semibold uppercase tracking-wider text-stone-500">Classification</span>
        <span className="pb-1 text-center text-[10px] font-semibold uppercase tracking-wider text-stone-500">White</span>
        <span className="pb-1 text-center text-[10px] font-semibold uppercase tracking-wider text-stone-500">Black</span>
        {MOVE_CLASS_LIST.map((moveClass) => (
          <div key={moveClass.id} className="contents">
            <span className="flex min-w-0 items-center gap-2 truncate text-xs font-medium text-stone-300">
              <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: moveClass.color }} />
              {moveClass.label}
            </span>
            <Count value={white.counts[moveClass.id]} label={`${white.counts[moveClass.id]} White ${moveClass.label} moves`} />
            <Count value={black.counts[moveClass.id]} label={`${black.counts[moveClass.id]} Black ${moveClass.label} moves`} />
          </div>
        ))}
      </div>
    </section>
  );
}

function AccuracyCard({ label, accuracy }: { label: string; accuracy: number }) {
  return (
    <div
      aria-label={`${label} accuracy ${accuracy.toFixed(1)} percent`}
      className="rounded-lg border border-white/5 bg-white/[0.04] px-3 py-2"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500">{label} accuracy</p>
      <p className="mt-0.5 font-sans text-2xl font-bold leading-none tracking-tight tabular-nums text-stone-50">
        {accuracy.toFixed(1)}<span className="ml-0.5 text-base text-stone-300">%</span>
      </p>
    </div>
  );
}

function Count({ value, label }: { value: number; label: string }) {
  return (
    <span aria-label={label} className="rounded-md bg-white/[0.05] py-0.5 text-center text-xs font-semibold tabular-nums text-stone-200">
      {value}
    </span>
  );
}
