import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Pause, Play } from "lucide-react";
import { useGameStore } from "../../store/gameStore";
import { TactileButton } from "../ui/TactileButton";

interface Props {
  className?: string;
  viewingPast?: boolean;
  onBackToLatest?: () => void;
}

export function NavControls({ className = "", viewingPast = false, onBackToLatest }: Props) {
  const { moves, viewIndex, firstMove, previousMove, nextMove, lastMoveInHistory } = useGameStore();
  const [playing, setPlaying] = useState(false);
  const controlsRef = useRef<HTMLDivElement>(null);
  const atStart = viewIndex <= -1;
  const atEnd = viewIndex >= moves.length - 1;

  useEffect(() => {
    if (!playing) return;
    if (atEnd) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(nextMove, 1000);
    return () => window.clearTimeout(timer);
  }, [playing, atEnd, viewIndex, nextMove]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!controlsRef.current?.getClientRects().length) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
      if (event.key === "ArrowLeft") { event.preventDefault(); previousMove(); }
      else if (event.key === "ArrowRight") { event.preventDefault(); nextMove(); }
      else if (event.key === "Home") { event.preventDefault(); firstMove(); }
      else if (event.key === "End") { event.preventDefault(); lastMoveInHistory(); }
      else if (event.code === "Space") { event.preventDefault(); setPlaying((value) => !value); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [firstMove, previousMove, nextMove, lastMoveInHistory]);

  const buttonClass = "!h-11 !w-11 !shrink-0 !p-0 rounded-lg";
  const titleClass = "flex items-center justify-center";
  return (
    <div ref={controlsRef} className={`flex min-w-0 items-center justify-center gap-1 ${className}`} aria-label="Move navigation">
      <TactileButton className={`${buttonClass} ${titleClass}`} onClick={firstMove} disabled={atStart} title="First move (Home)" aria-label="Go to first move">
        <ChevronsLeft size={19} />
      </TactileButton>
      <TactileButton className={`${buttonClass} ${titleClass}`} onClick={previousMove} disabled={atStart} title="Previous move (Left arrow)" aria-label="Previous move">
        <ChevronLeft size={19} />
      </TactileButton>
      <TactileButton className={`${buttonClass} ${titleClass}`} onClick={() => setPlaying((value) => !value)} disabled={moves.length === 0} title={playing ? "Pause autoplay (Space)" : "Play moves (Space)"} aria-label={playing ? "Pause autoplay" : "Play moves"}>
        {playing ? <Pause size={18} /> : <Play size={18} />}
      </TactileButton>
      <TactileButton className={`${buttonClass} ${titleClass}`} onClick={nextMove} disabled={atEnd} title="Next move (Right arrow)" aria-label="Next move">
        <ChevronRight size={19} />
      </TactileButton>
      <TactileButton className={`${buttonClass} ${titleClass}`} onClick={lastMoveInHistory} disabled={atEnd} title="Last move (End)" aria-label="Go to last move">
        <ChevronsRight size={19} />
      </TactileButton>
      {viewingPast && onBackToLatest && (
        <TactileButton
          className="!h-11 min-w-0 flex-1 !px-2 text-xs"
          onClick={onBackToLatest}
          title="Back to latest position"
          aria-label="Back to latest position"
        >
          Back to latest
        </TactileButton>
      )}
    </div>
  );
}
