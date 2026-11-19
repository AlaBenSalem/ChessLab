import { motion } from "framer-motion";
import { Activity, Cpu } from "lucide-react";
import type { GameAnalysis } from "../../hooks/useGameAnalysis";
import { TactileButton } from "../ui/TactileButton";
import { MoveClassificationSummary } from "./MoveClassificationSummary";

/** The part of the engine's evaluation this panel reads. `EngineEvaluation` satisfies it. */
interface PanelEvaluation {
  scoreType: "cp" | "mate";
  scoreValue: number;
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white/30 border-t-white"
    />
  );
}

/**
 * Formats an engine evaluation from White's point of view. Engine scores are
 * relative to the side to move, so they are flipped when Black is to move.
 */
function formatEvaluation(evaluation: PanelEvaluation, fen: string): string {
  const whiteToMove = fen.split(" ")[1] !== "b";
  const { scoreType, scoreValue } = evaluation;
  const white = whiteToMove ? scoreValue : -scoreValue;

  if (scoreType === "mate") {
    // A mate score of 0 means checkmate has been delivered: the side to move is
    // the one that was mated. Read the winner from the FEN rather than from the
    // sign of a zero, which is easily lost (JSON, arithmetic, copies).
    if (scoreValue === 0) return `Checkmate · ${whiteToMove ? "0-1" : "1-0"}`;
    return `${white < 0 ? "−" : "+"}M${Math.abs(white)}`;
  }

  // Round first, then sign, so a tiny negative score reads "0.0" and not "-0.0".
  const pawns = Math.round(Math.abs(white) / 10) / 10;
  const sign = pawns === 0 ? "" : white > 0 ? "+" : "−";
  return `${sign}${pawns.toFixed(1)}`;
}

interface Props {
  analysis: GameAnalysis;
  activePly: number;
  resultHeader: string;
  currentFen: string;
  evaluation: PanelEvaluation | null;
  onAnalyzeGame: () => void;
  className?: string;
}

export function AnalysisPanel({
  analysis,
  activePly,
  resultHeader,
  currentFen,
  evaluation,
  onAnalyzeGame,
  className = "",
}: Props) {
  const {
    isThinking,
    isAnalyzing,
    progress,
    busy,
    result,
    analyzePosition,
    cancelAnalysis,
    error,
  } = analysis;
  const resultText =
    resultHeader === "*" && result ? result.gameResult : resultHeader;
  const evalLabel = evaluation
    ? formatEvaluation(evaluation, currentFen)
    : null;
  const percent = Math.round(Math.min(100, Math.max(0, progress)));
  const activeMove = result?.moves[activePly];
  const completedReview = Boolean(result && !isAnalyzing);

  return (
    <div
      className={`flex h-full min-h-0 min-w-0 flex-col gap-2 overflow-y-auto overscroll-contain rounded-2xl border border-amber-100/10 bg-stone-950/65 p-3 shadow-xl backdrop-blur-md ${className}`}
    >
      <header className="flex shrink-0 items-center justify-between gap-2">
        <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-amber-100/80">
          Game Review
        </h2>
      </header>

      {result && !isAnalyzing && (
        <MoveClassificationSummary
          white={result.whiteReport}
          black={result.blackReport}
        />
      )}

      {resultText !== "*" && (
        <p className="shrink-0 text-center text-xs font-semibold text-stone-300">
          Result: {resultText}
        </p>
      )}

      {evalLabel && (
        <p className="shrink-0 rounded-lg bg-black/25 px-3 py-2 text-center text-sm font-semibold tabular-nums text-stone-200">
          Position evaluation <span className="ml-1 text-emerald-300">{evalLabel}</span>
        </p>
      )}

      {activeMove && (
        <div className="max-h-[4.5rem] shrink-0 overflow-hidden rounded-xl border border-white/5 bg-black/30 px-3 py-2 text-xs leading-5 text-stone-300">
          <p className="truncate font-semibold text-stone-100">
            Best continuation: {activeMove.bestMoveSan ?? "—"}
          </p>
          <p className="line-clamp-2 break-words">{activeMove.explanation}</p>
        </div>
      )}

      {!completedReview && <TactileButton
        onClick={onAnalyzeGame}
        disabled={busy}
        className="w-full shrink-0 py-3 text-base"
      >
        {isAnalyzing ? (
          <>
            <Spinner />
            Game Review ({percent}%)
          </>
        ) : (
          <>
            <Activity size={20} strokeWidth={2.25} />
            Game Review
          </>
        )}
      </TactileButton>}
      {isAnalyzing && (
        <div
          className="h-1.5 w-full shrink-0 overflow-hidden rounded-full bg-black/40"
          role="progressbar"
          aria-label="Game review progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <motion.div
            className="h-full bg-gradient-to-r from-amber-400 to-orange-500"
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
        </div>
      )}
      {isAnalyzing && (
        <button
          type="button"
          onClick={() => cancelAnalysis()}
          className="shrink-0 text-xs text-stone-400 underline hover:text-white"
        >
          Cancel review
        </button>
      )}

      {!completedReview && <TactileButton
        variant="blue"
        onClick={() => analyzePosition()}
        disabled={busy}
        className="w-full shrink-0 py-2.5"
      >
        {isThinking ? (
          <>
            <Spinner />
            Thinking…
          </>
        ) : (
          <>
            <Cpu size={18} strokeWidth={2.25} />
            Hint
          </>
        )}
      </TactileButton>}

      {error && (
        <p role="alert" className="shrink-0 text-sm text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
