import type { PieceSymbol, Square } from "chess.js";

interface Props {
  request: { from: Square; to: Square } | null;
  turn: "w" | "b";
  onPromote: (from: Square, to: Square, piece: "q" | "r" | "b" | "n") => void;
  onCancel: () => void;
}

const promotionPieces = ["q", "r", "b", "n"] as const;
const pieceSrc = (color: "w" | "b", type: PieceSymbol) => `/pieces/${color}${type.toUpperCase()}.svg`;

export function PromotionPicker({ request, turn, onPromote, onCancel }: Props) {
  if (!request) return null;
  return <div className="fixed inset-0 z-40 grid place-items-center bg-black/60"><section className="rounded-xl bg-[#2a2a2a] p-4 shadow-2xl"><p className="mb-3 text-center text-[15px] font-semibold text-stone-200">Choose promotion</p><div className="flex gap-2">{promotionPieces.map((piece) => <button key={piece} type="button" aria-label={`Promote to ${piece}`} onClick={() => { onPromote(request.from, request.to, piece); onCancel(); }} className="rounded-lg bg-white/5 p-2 hover:bg-white/15"><img className="h-16 w-16" src={pieceSrc(turn, piece)} alt={piece} /></button>)}</div></section></div>;
}
