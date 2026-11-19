import { SECONDARY_BTN, PANEL } from "../styles";

interface Props {
  computerMode: boolean;
  hasMoves: boolean;
  whiteName: string;
  whiteRating: string;
  blackName: string;
  blackRating: string;
  timeControl: string;
  statusText: string;
  openingName?: string;
  openingEco?: string;
  showOpening: boolean;
  engineThinking: boolean;
  engineMessage: string;
  plies: number;
  duration: string;
  engineError: string;
  viewingHistory: boolean;
  onBackToLatest: () => void;
  onRestart: () => void;
  onExit: () => void;
}

export function GameInfoPanel({ computerMode, hasMoves, whiteName, whiteRating, blackName, blackRating, timeControl, statusText, openingName, openingEco, showOpening, engineThinking, engineMessage, plies, duration, engineError, viewingHistory, onBackToLatest, onRestart, onExit }: Props) {
  return <section className={`${PANEL} flex h-64 shrink-0 flex-col p-4`}><div className="min-h-0 flex-1 overflow-y-auto pr-1"><h2 className="text-[15px] font-extrabold tracking-wide text-stone-100">{computerMode ? "COMPUTER GAME" : hasMoves ? "GAME" : "NEW GAME"}</h2><p className="mt-1.5 text-[15px] leading-snug text-stone-300">{whiteName} ({whiteRating}) vs {blackName} ({blackRating}){computerMode ? ` (${timeControl})` : ""}</p><p role="status" aria-live="polite" className="mt-2.5 text-[15px] font-semibold text-emerald-400">{statusText}</p>{showOpening && <p className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5 text-sm text-stone-400" title={openingName}><span className="font-semibold text-stone-300">Opening</span><span>·</span><span className="text-stone-200">{openingName}</span>{openingEco && <span className="text-xs text-stone-500">({openingEco})</span>}</p>}{computerMode && <p className="mt-1 text-sm text-stone-400">{engineThinking ? "Stockfish is thinking…" : engineMessage} · {plies} plies · {duration}</p>}{engineError && <p role="alert" className="mt-2 rounded-lg bg-red-950/60 p-2.5 text-sm text-red-200">{engineError}</p>}{viewingHistory && <button type="button" onClick={onBackToLatest} className="mt-3 text-sm font-semibold text-emerald-400 hover:text-emerald-300">Back to latest move</button>}</div>{computerMode ? <div className="mt-3 grid grid-cols-3 gap-2"><button type="button" onClick={onRestart} className={SECONDARY_BTN}>Restart</button><button type="button" onClick={onExit} className={SECONDARY_BTN}>Exit game</button></div> : <div className="mt-3"><input aria-label="Message" placeholder="Message…" className="w-full border-t border-white/10 bg-transparent px-1 pt-3 text-[15px] text-stone-100 outline-none placeholder:text-stone-500 focus:border-emerald-400/60" /></div>}</section>;
}
