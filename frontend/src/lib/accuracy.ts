import type { EngineEvaluation } from "../engine/StockfishEngine";

/** Lichess's public centipawn-to-win-chances curve; output is 0..1. */
export function winProbability(cp: number, mate: number | null): number {
  if (mate !== null) {
    if (mate === 0) return Object.is(mate, -0) ? 0 : 1;
    return mate > 0 ? 1 : 0;
  }
  return 1 / (1 + Math.exp(-0.00368208 * cp));
}

/** Convert a Stockfish score from the FEN's side-to-move perspective to White's. */
export function toWhitePov(evaluation: EngineEvaluation, fen: string): EngineEvaluation {
  const blackToMove = fen.split(" ")[1] === "b";
  const convertScore = (value: number, isMate: boolean) => {
    if (isMate && value === 0) return blackToMove ? 0 : -0;
    return blackToMove ? -value : value;
  };
  return {
    ...evaluation,
    scoreValue: convertScore(evaluation.scoreValue, evaluation.scoreType === "mate"),
    lines: evaluation.lines.map((line) => ({
      ...line,
      cp: blackToMove ? -line.cp : line.cp,
      mate: line.mate === null ? null : convertScore(line.mate, true),
    })),
  };
}

/** A configurable, game-data-derived expected-score proxy. It is not Chess.com's model. */
export function expectedScore(
  evaluation: EngineEvaluation,
  color: "w" | "b",
): number {
  const whiteScore = winProbability(
    evaluation.scoreType === "cp" ? evaluation.scoreValue : 0,
    evaluation.scoreType === "mate" ? evaluation.scoreValue : null,
  );
  return color === "w" ? whiteScore : 1 - whiteScore;
}

export interface MoveQuality {
  bestExpectedScore: number;
  playedExpectedScore: number;
  expectedScoreLoss: number;
  centipawnLoss: number | null;
}

/** Compare two searches made from the same root position and mover POV. */
export function compareContinuations(
  best: EngineEvaluation,
  played: EngineEvaluation,
  color: "w" | "b",
): MoveQuality {
  const bestExpectedScore = expectedScore(best, color);
  const playedExpectedScore = expectedScore(played, color);
  const bestCp =
    best.scoreType === "cp"
      ? color === "w"
        ? best.scoreValue
        : -best.scoreValue
      : null;
  const playedCp =
    played.scoreType === "cp"
      ? color === "w"
        ? played.scoreValue
        : -played.scoreValue
      : null;
  return {
    bestExpectedScore,
    playedExpectedScore,
    expectedScoreLoss: Math.max(0, bestExpectedScore - playedExpectedScore),
    centipawnLoss:
      bestCp === null || playedCp === null
        ? null
        : Math.max(0, bestCp - playedCp),
  };
}

/** Lichess's published per-move formula; qualityLoss is an expected-score delta, 0..1. */
export function accuracyFromLoss(qualityLoss: number): number {
  const lossPct = Math.max(0, Math.min(1, qualityLoss)) * 100;
  if (lossPct === 0) return 100;
  const raw = 103.1668 * Math.exp(-0.04354 * lossPct) - 3.1669;
  return Math.max(0, Math.min(100, raw));
}

export interface AccuracySample {
  color: "w" | "b";
  expectedBeforeWhite: number;
  expectedAfterWhite: number;
  accuracy: number;
  isBook: boolean;
  isForced: boolean;
}

const mean = (values: number[]) =>
  values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 100;

/**
 * Lichess-style aggregation: average a local-volatility-weighted mean and
 * harmonic mean. Samples marked Book or Forced are excluded from the score.
 */
export function aggregateAccuracy(
  samples: AccuracySample[],
  color: "w" | "b",
): number {
  const active = samples.filter((sample) => !sample.isBook && !sample.isForced);
  if (!active.length) return 100;

  const states = [
    active[0].expectedBeforeWhite,
    ...active.map((s) => s.expectedAfterWhite),
  ].map((value) => value * 100);
  const windowSize = Math.max(2, Math.min(8, Math.floor(active.length / 10)));

  // Array.from keeps the element type as number[]. (Array(n).fill(...) returns
  // any[], which silently turned `windows` into any[] and caused the
  // "implicitly has an 'any' type" error below.)
  const windows: number[][] = [
    ...Array.from(
      { length: Math.max(0, Math.min(windowSize, states.length) - 2) },
      () => states.slice(0, windowSize),
    ),
    ...Array.from(
      { length: Math.max(0, states.length - windowSize + 1) },
      (_, i) => states.slice(i, i + windowSize),
    ),
  ];
  const weights = windows.map((win) => {
    const avg = mean(win);
    const deviation = Math.sqrt(mean(win.map((value) => (value - avg) ** 2)));
    return Math.max(0.5, Math.min(12, deviation));
  });

  const selected = active
    .map((sample, index) => ({ sample, weight: weights[index] ?? 0.5 }))
    .filter(({ sample }) => sample.color === color);
  if (!selected.length) return 100;

  const weighted =
    selected.reduce(
      (sum, item) => sum + item.sample.accuracy * item.weight,
      0,
    ) / selected.reduce((sum, item) => sum + item.weight, 0);
  const harmonic =
    selected.length /
    selected.reduce(
      (sum, item) => sum + 1 / Math.max(item.sample.accuracy, 0.01),
      0,
    );
  return Math.max(0, Math.min(100, (weighted + harmonic) / 2));
}

/**
 * Calculate the accuracy of a single move.
 *
 * Both evaluations MUST be from White's point of view (positive = good for
 * White), regardless of whose turn it is in each position.
 *
 * @param evalBefore - Engine evaluation of the position BEFORE the move
 * @param evalAfter  - Engine evaluation of the position AFTER the move
 * @param isWhiteMove - True if White made the move
 * @returns { accuracy, loss }
 *   - accuracy: 0–100, how well the player played (100 = perfect)
 *   - loss: 0–1, fraction of win probability thrown away (0 = perfect)
 */
export function moveAccuracy(
  evalBefore: { cp: number; mate: number | null },
  evalAfter: { cp: number; mate: number | null },
  isWhiteMove: boolean,
): { accuracy: number; loss: number } {
  // Get win probability from White's perspective for both positions
  let probBefore = winProbability(evalBefore.cp, evalBefore.mate);
  let probAfter = winProbability(evalAfter.cp, evalAfter.mate);

  // Invert for Black's moves — we want probability from the mover's side
  if (!isWhiteMove) {
    probBefore = 1 - probBefore;
    probAfter = 1 - probAfter;
  }

  // How much win probability did the player give away?
  // Clamp to [0, 1] to handle edge cases (engine noise, mate transitions)
  const loss = Math.max(0, Math.min(1, probBefore - probAfter));

  // Lichess's accuracy curve — converts loss to a 0–100 score
  return {
    accuracy: accuracyFromLoss(loss),
    loss,
  };
}

/**
 * Calculate the average accuracy of a game from an array of per-move accuracies.
 * Book moves and forced moves should be excluded from the input array.
 *
 * Returns 100 if the array is empty (e.g., a pure book game).
 */
export function averageAccuracy(accuracies: number[]): number {
  if (accuracies.length === 0) return 100;
  return accuracies.reduce((a, b) => a + b, 0) / accuracies.length;
}
