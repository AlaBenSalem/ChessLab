import { Activity, FileDown, FlipHorizontal2, Gauge, RotateCcw, Swords, Volume2, VolumeX } from "lucide-react";
import { PgnExportButton } from "../PgnExportButton";
import { RailButton } from "./RailButton";

interface Props {
  computerMode: boolean;
  setupOpen: boolean;
  analysisBusy: boolean;
  hasMoves: boolean;
  importOpen: boolean;
  showEval: boolean;
  muted: boolean;
  isFlipped: boolean;
  onComputer: () => void;
  onAnalyze: () => void;
  onImport: () => void;
  onExport: () => void;
  onToggleEval: () => void;
  onToggleMute: () => void;
  onFlip: () => void;
  onRestart: () => void;
}

export function PrimaryRail({ computerMode, setupOpen, analysisBusy, hasMoves, importOpen, showEval, muted, isFlipped, onComputer, onAnalyze, onImport, onExport, onToggleEval, onToggleMute, onFlip, onRestart }: Props) {
  return <nav aria-label="Primary" className="z-20 flex h-14 shrink-0 items-center gap-1 bg-[#141414] px-2 lg:h-full lg:w-14 lg:flex-col lg:px-0 lg:py-3"><img src="/chess.svg" alt="ChessLab" className="h-9 w-9 shrink-0 rounded-md object-cover lg:mb-3" /><RailButton label={computerMode ? "Exit computer game" : "Play vs Computer"} active={computerMode || setupOpen} onClick={onComputer}><Swords size={22} /></RailButton><RailButton label="Analyze game" disabled={analysisBusy || !hasMoves} onClick={onAnalyze}><Activity size={22} /></RailButton><RailButton label="Import PGN" active={importOpen} onClick={onImport}><FileDown size={22} /></RailButton><PgnExportButton disabled={!hasMoves} onClick={onExport} /><div className="flex-1" /><RailButton label={showEval ? "Hide evaluation bar" : "Show evaluation bar"} active={showEval} onClick={onToggleEval}><Gauge size={22} /></RailButton><RailButton label={muted ? "Unmute sounds" : "Mute sounds"} onClick={onToggleMute}>{muted ? <VolumeX size={22} /> : <Volume2 size={22} />}</RailButton><RailButton label="Flip board" active={isFlipped} onClick={onFlip}><FlipHorizontal2 size={22} /></RailButton><RailButton label={computerMode ? "Restart computer game" : "Restart game"} onClick={onRestart}><RotateCcw size={22} /></RailButton></nav>;
}
