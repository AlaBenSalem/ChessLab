import { Crown } from "lucide-react";
import type { Color, PieceSymbol } from "chess.js";

export interface CapturedPiece {
  color: Color;
  type: PieceSymbol;
}

interface Props {
  color: Color;
  toMove: boolean;
  captured: CapturedPiece[];
  materialAdvantage: number;
  winner: boolean;
  name?: string;
  clock?: string;
}

const COLOR_NAME: Record<Color, string> = { w: "White", b: "Black" };

export function PlayerBar({ color, toMove, captured, materialAdvantage, winner, name, clock }: Props) {
  const colorName = COLOR_NAME[color];
  return (
    <div className={`flex min-h-[3.75rem] w-full items-center gap-2 rounded-xl border px-2.5 py-2 shadow-lg backdrop-blur-md sm:gap-3 sm:px-3 ${toMove ? "border-amber-300/35 bg-stone-950/75" : "border-amber-100/10 bg-stone-950/55"}`}>
      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-200/15 bg-gradient-to-br from-amber-900/80 to-stone-950 sm:h-10 sm:w-10">
        <img src={`/pieces/${color}K.svg`} alt="" aria-hidden className="h-8 w-8 object-contain sm:h-9 sm:w-9" />
        {winner && <Crown aria-label="Winner" className="absolute -right-1.5 -top-2 h-4 w-4 fill-amber-300 text-amber-200 drop-shadow" />}
      </div>

      <div className="min-w-0 max-w-[8rem] shrink sm:max-w-[11rem]">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-bold text-amber-50 sm:text-base">{colorName}</span>
          {winner && <Crown size={14} aria-hidden className="shrink-0 text-amber-300" />}
        </div>
        <span className="block truncate text-[10px] leading-tight text-stone-400">{name ?? "Name not set"}</span>
      </div>

      <div className="ml-auto flex min-w-0 items-center justify-end gap-2 sm:gap-3">
        {clock !== undefined && <span className={`rounded-md px-2 py-1 font-mono text-sm font-bold ${toMove ? "bg-green-600 text-white" : "bg-[#4a4845] text-stone-200"}`}>{clock}</span>}
        {materialAdvantage > 0 && (
          <span className="shrink-0 rounded-md bg-emerald-500/10 px-1.5 py-1 text-xs font-bold text-emerald-300" title={`${materialAdvantage} point material advantage`}>
            +{materialAdvantage}
          </span>
        )}
        <div className="flex min-w-0 items-center justify-end" aria-label={`Pieces captured by ${colorName}`}>
          {captured.length ? captured.map((piece, index) => (
            <img
              key={`${piece.color}${piece.type}-${index}`}
              src={`/pieces/${piece.color}${piece.type.toUpperCase()}.svg`}
              alt=""
              aria-hidden
              className="-ml-1.5 h-5 w-5 drop-shadow sm:h-6 sm:w-6"
            />
          )) : <span className="truncate text-[10px] text-stone-500">No captures</span>}
        </div>
        <span className="hidden text-[10px] text-stone-500 sm:inline">Captured</span>
      </div>

      <span role="status" aria-label={`${colorName} ${toMove ? "to move" : "waiting"}`} className={`ml-1 flex shrink-0 items-center gap-1.5 text-[10px] font-semibold sm:ml-2 ${toMove ? "text-amber-200" : "text-stone-500"}`}>
        <span className={`h-2 w-2 rounded-full ${toMove ? "bg-amber-300 shadow-[0_0_8px_rgba(252,211,77,0.75)]" : "bg-stone-600"}`} />
        <span className="hidden sm:inline">{toMove ? "To move" : "Waiting"}</span>
      </span>
    </div>
  );
}
