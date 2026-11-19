import { SECONDARY_BTN } from "../styles";

interface Props {
  open: boolean;
  title: string;
  result: string;
  moveCount: number;
  duration: string;
  onRematch: () => void;
  onAnalyze: () => void;
  onMenu: () => void;
}

export function GameOverOverlay({ open, title, result, moveCount, duration, onRematch, onAnalyze, onMenu }: Props) {
  if (!open) return null;
  return <div className="fixed inset-0 z-40 grid place-items-center bg-black/70 p-4"><section className="w-full max-w-md rounded-2xl bg-[#2a2a2a] p-8 text-center shadow-2xl"><h2 className="text-4xl font-extrabold text-white">{title}</h2><p className="mt-3 text-base text-stone-300">{result}</p><p className="mt-1 text-sm text-stone-500">{moveCount} moves · {duration}</p><div className="mt-7 grid grid-cols-3 gap-2"><button type="button" onClick={onRematch} className="rounded-xl border-b-4 border-emerald-700 bg-emerald-500 px-2 py-3 text-[15px] font-extrabold text-white hover:bg-emerald-400">Rematch</button><button type="button" onClick={onAnalyze} className={SECONDARY_BTN}>Analyze</button><button type="button" onClick={onMenu} className={SECONDARY_BTN}>Menu</button></div></section></div>;
}
