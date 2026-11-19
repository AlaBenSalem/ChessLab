import type { Color, PieceSymbol, Square } from "chess.js";

interface Props {
  preview: { from: Square; x: number; y: number } | null;
  piece?: { color: Color; type: PieceSymbol };
}

export function DragGhost({ preview, piece }: Props) {
  if (!preview || !piece) return null;
  return <img aria-hidden src={`/pieces/${piece.color}${piece.type.toUpperCase()}.svg`} className="pointer-events-none fixed z-50 h-[calc(var(--board-size)/8)] w-[calc(var(--board-size)/8)] -translate-x-1/2 -translate-y-1/2 drop-shadow-xl" style={{ left: preview.x, top: preview.y }} draggable={false} />;
}
