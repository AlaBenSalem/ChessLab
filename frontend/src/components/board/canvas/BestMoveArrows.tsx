import type { Square } from "chess.js";
import { FILES, RANKS } from "../../../types/chess";

export interface BestMoveArrow { from: Square; to: Square }

interface Props {
  arrows: BestMoveArrow[];
  displayFiles: readonly string[];
  displayRanks: readonly string[];
}

export function BestMoveArrows({ arrows, displayFiles, displayRanks }: Props) {
  if (!arrows.length) return null;
  return (
    <svg aria-label="Stockfish recommended move arrows" role="img" className="pointer-events-none absolute inset-0 z-20 h-full w-full overflow-visible" viewBox="0 0 800 800" preserveAspectRatio="none">
      <defs>{[{ color: "#35d04f", marker: "best" }, { color: "#f2ae3d", marker: "candidate" }, { color: "#56b8ef", marker: "alternate" }].map(({ color, marker }) => (
        <marker key={marker} id={`analysis-arrow-${marker}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" markerUnits="strokeWidth" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill={color} /></marker>
      ))}</defs>
      {arrows.map((arrow, index) => {
        const fromFile = displayFiles.indexOf(arrow.from[0] as (typeof FILES)[number]);
        const fromRank = displayRanks.indexOf(arrow.from[1] as (typeof RANKS)[number]);
        const toFile = displayFiles.indexOf(arrow.to[0] as (typeof FILES)[number]);
        const toRank = displayRanks.indexOf(arrow.to[1] as (typeof RANKS)[number]);
        const x1 = (fromFile + 0.5) * 100, y1 = (fromRank + 0.5) * 100;
        const x2 = (toFile + 0.5) * 100, y2 = (toRank + 0.5) * 100;
        const colors = ["#35d04f", "#f2ae3d", "#56b8ef"];
        const markers = ["best", "candidate", "alternate"];
        const color = colors[index];
        const label = index === 0 ? "Best move" : `Candidate ${index + 1}`;
        return <g key={`${arrow.from}-${arrow.to}`}><title>{`${label}: ${arrow.from} to ${arrow.to}`}</title>
          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#10190f" strokeWidth={index === 0 ? 15 : 12} strokeLinecap="round" opacity="0.72" />
          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={index === 0 ? 9 : 7} strokeLinecap="round" opacity={index === 0 ? 0.96 : 0.78} markerEnd={`url(#analysis-arrow-${markers[index]})`} />
          <circle cx={x1} cy={y1} r={index === 0 ? 10 : 8} fill={color} stroke="#10190f" strokeWidth="4" opacity={index === 0 ? 0.98 : 0.82} />
        </g>;
      })}
    </svg>
  );
}
