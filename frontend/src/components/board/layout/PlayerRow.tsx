import { Cpu, Trophy } from "lucide-react";
import type { Color, PieceSymbol } from "chess.js";

interface Props {
  color: Color;
  name: string;
  rating: string;
  engine: boolean;
  captured: { color: Color; type: PieceSymbol }[];
  advantage: number;
  winner: boolean;
}

const pieceSrc = (color: Color, type: PieceSymbol) =>
  `/pieces/${color}${type.toUpperCase()}.svg`;

export function PlayerRow({ color, name, rating, engine, captured, advantage, winner }: Props) {
  return (
    <div className="flex items-center gap-3 py-3.5">
      <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-[#3b3b3b]">
        {engine ? (
          <Cpu size={30} className="text-stone-300" />
        ) : (
          <img src={pieceSrc(color, "k")} alt="" aria-hidden className="h-11 w-11" draggable={false} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[17px] font-bold leading-tight text-stone-50">
          {name} <span className="font-semibold text-stone-400">({rating})</span>
        </p>
        <div className="mt-1.5 flex h-5 items-center pl-1">
          {captured.map((piece, index) => (
            <img key={index} src={pieceSrc(piece.color, piece.type)} alt="" aria-hidden className="-ml-1 h-5 w-5" draggable={false} />
          ))}
        </div>
      </div>
      <div className="flex w-12 shrink-0 justify-end text-2xl font-bold text-stone-50">
        {winner ? <Trophy size={24} className="text-amber-400" aria-label="Winner" /> : advantage > 0 ? `+${advantage}` : null}
      </div>
    </div>
  );
}
