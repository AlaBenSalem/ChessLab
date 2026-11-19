import type { ColorChoice, Difficulty, TimeControl } from "../../../hooks/useComputerGame";
import { DIFFICULTY_RANGE, ENGINE_STRENGTH, TIME_CONTROLS } from "../../../hooks/useComputerGame";
import { Play } from "lucide-react";
import { PRIMARY_BTN, SECONDARY_BTN, PANEL, optionClass } from "../styles";

interface Props {
  colorChoice: ColorChoice;
  difficulty: Difficulty;
  timeControl: TimeControl;
  onColorChoiceChange: (value: ColorChoice) => void;
  onDifficultyChange: (value: Difficulty) => void;
  onTimeControlChange: (value: TimeControl) => void;
  onClose: () => void;
  onStart: () => void;
}

export function SetupPanel({ colorChoice, difficulty, timeControl, onColorChoiceChange, onDifficultyChange, onTimeControlChange, onClose, onStart }: Props) {
  return <section className={`${PANEL} flex min-h-[520px] flex-1 flex-col gap-5 overflow-y-auto p-5 lg:min-h-0`}><div className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-extrabold text-white">Play vs Computer</h2><p className="mt-1 text-[15px] text-stone-400">Set up a game on this board.</p></div><button type="button" onClick={onClose} className={SECONDARY_BTN}>Close</button></div><div><h3 className="mb-2 text-sm font-bold text-stone-400">Your color</h3><div className="grid grid-cols-3 gap-2">{([ ["w", "White"], ["b", "Black"], ["random", "Random"] ] as const).map(([value, label]) => <button key={value} type="button" onClick={() => onColorChoiceChange(value)} className={optionClass(colorChoice === value)}>{label}</button>)}</div></div><div><h3 className="mb-2 text-sm font-bold text-stone-400">Difficulty</h3><div className="grid grid-cols-2 gap-2">{(Object.keys(ENGINE_STRENGTH) as Difficulty[]).map((level) => <button key={level} type="button" onClick={() => onDifficultyChange(level)} className={`${optionClass(difficulty === level)} text-left`}><span className="block text-base font-bold">{level}</span><span className="text-xs font-medium text-stone-400">{DIFFICULTY_RANGE[level]} Elo</span></button>)}</div><p className="mt-2 text-xs text-stone-500">Engine profile: skill {ENGINE_STRENGTH[difficulty].skill}/20, depth {ENGINE_STRENGTH[difficulty].depth}</p></div><div><h3 className="mb-2 text-sm font-bold text-stone-400">Time control</h3><div className="grid grid-cols-3 gap-2">{(Object.keys(TIME_CONTROLS) as TimeControl[]).map((control) => <button key={control} type="button" onClick={() => onTimeControlChange(control)} className={optionClass(timeControl === control)}>{control}</button>)}</div></div><p className="text-xs leading-relaxed text-stone-500">Stockfish runs in a worker. Lower levels use lower skill and shallower searches; strength is an estimate.</p><button type="button" onClick={onStart} className={`${PRIMARY_BTN} mt-auto`}><Play size={20} /> Start game</button></section>;
}
