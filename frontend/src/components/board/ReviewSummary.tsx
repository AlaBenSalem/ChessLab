import type { PlayerAccuracyReport } from "../../hooks/useGameAnalysis";

interface Props {
  white: PlayerAccuracyReport;
  black: PlayerAccuracyReport;
}

export function ReviewSummary({ white, black }: Props) {
  return (
    <p className="shrink-0 truncate text-xs text-stone-400" aria-label={`White accuracy ${white.accuracy.toFixed(1)} percent; Black accuracy ${black.accuracy.toFixed(1)} percent`}>
      Accuracy <span className="font-bold text-stone-100">W {white.accuracy.toFixed(1)}%</span>
      <span className="mx-1.5 text-stone-600">·</span>
      <span className="font-bold text-stone-100">B {black.accuracy.toFixed(1)}%</span>
    </p>
  );
}
