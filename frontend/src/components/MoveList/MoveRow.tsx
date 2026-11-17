import { memo } from "react";
import type { HistoryMove } from "../../store/gameStore";
import type { Classification } from "../../lib/classification";
import { MoveBadge } from "../badges/MoveBadge";

interface Props {
  move?: HistoryMove;
  ply: number;
  isCurrent: boolean;
  onClick: (ply: number) => void;
  buttonRef?: React.Ref<HTMLButtonElement>;
  classification?: Classification;
}

export const MoveRow = memo(function MoveRow({ move, ply, isCurrent, onClick, buttonRef, classification }: Props) {
  if (!move) return <span />;
  const pieceIcon = move.piece === "p" ? null : `/pieces/${move.color}${move.piece.toUpperCase()}.svg`;
  const san = move.san.replace(/^[KQRBN]/, "");
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={() => onClick(ply)}
      title={`${move.color === "w" ? "White" : "Black"} move ${move.moveNumber}: ${move.san}${classification ? `, ${classification}` : ""}`}
      aria-label={`${move.color === "w" ? "White" : "Black"}, move ${move.moveNumber}, ${move.san}${classification ? `, ${classification}` : ""}`}
      aria-current={isCurrent ? "step" : undefined}
      className={`flex h-9 min-w-0 items-center gap-1 rounded-md px-2 text-left transition-colors ${
        isCurrent ? "bg-amber-500/25 text-amber-50 ring-1 ring-amber-300/30" : "text-stone-200 hover:bg-white/5"
      }`}
    >
      {pieceIcon && <img src={pieceIcon} alt="" aria-hidden className="h-4 w-4 shrink-0" />}
      <span className="truncate font-mono">{san}</span>
      {classification && <MoveBadge kind={classification} size="list" />}
    </button>
  );
});
