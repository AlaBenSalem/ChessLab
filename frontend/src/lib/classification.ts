import type { MoveClass } from "./moveClasses";

/** All move class ids are defined alongside their shared labels and styling. */
export type Classification = MoveClass;

/**
 * Chess.com's exact move review rules are proprietary. What it publishes is:
 *   - the expected-points-lost table below (Best through Blunder), and
 *   - plain-language rules for Brilliant, Great and Miss, plus the note that
 *     expected points, "winning", and how generous the special classes are all
 *     depend on the player's rating.
 * Everything else here (the rating curve, the Great/Miss cutoffs, the
 * sacrifice test) is an approximation of those published rules, tuned to be
 * easy to adjust. Every number lives in a constant at the top of this file.
 */

// ---------------------------------------------------------------------------
// Thresholds
// ---------------------------------------------------------------------------

export const REVIEW_THRESHOLDS = {
  // Upper limits of Chess.com's expected-points-lost bands.
  excellent: 0.02,
  good: 0.05,
  inaccuracy: 0.1,
  mistake: 0.2,
  /** @deprecated Identical to `mistake`: anything above it is a blunder. */
  blunderAbove: 0.2,
  /**
   * Loss at or below this is treated as the engine's best move. Chess.com's
   * table gives Best a loss of exactly 0.00; this absorbs ties and 1cp noise.
   */
  bestEpsilon: 0.001,
  /** Brilliant: you must not be left in a bad position (expected points >= 0.5). */
  brilliantEqualOrBetter: 0.5,
  /** Brilliant: you must not have been completely winning without the move (< 0.9). */
  brilliantNotAlreadyWinning: 0.9,
} as const;

export const SPECIAL_MOVE_RULES = {
  /** Expected points at or above this count as a winning position... */
  winningAtLeast: 0.65,
  /** ...and at or below this as a losing one. In between is "equal". */
  losingAtMost: 0.35,

  /** Brilliant: pawns' worth of material that must be given up (3 = a minor piece). */
  sacrificeMin: 3,
  /** More generous bar for newer players (2 also counts an exchange sacrifice). */
  sacrificeMinNewer: 2,
  /** Players below this rating get the generous sacrifice bar. */
  newerPlayerRating: 1000,

  /**
   * Great ("only good move"): how many expected points the move must be ahead of
   * the best alternative. Interpolated by rating: beginners get the smaller gap.
   */
  greatOnlyMoveGapBeginner: 0.1,
  greatOnlyMoveGapStrong: 0.2,
  /** Great (outcome change): smaller gap, but the move must lift the outcome band. */
  greatOutcomeChangeGap: 0.1,

  /** Miss: the move must lose at least this much (more than a "Good" move)... */
  missMinLoss: 0.05,
  /** ...right after the opponent gave up at least this much. */
  missMinOpponentLoss: 0.05,
} as const;

// ---------------------------------------------------------------------------
// Expected points
// ---------------------------------------------------------------------------

/**
 * Engine score from the point of view of the player who is moving.
 * `cp` is centipawns. `mate` is moves to mate: positive means the mover mates,
 * negative means the mover gets mated, and 0 means the move itself delivered
 * checkmate. A draw or stalemate is `{ cp: 0 }`.
 */
export type EngineScore = { cp: number } | { mate: number };

export const DEFAULT_RATING = 1500;

const BEGINNER_RATING = 600;
const STRONG_RATING = 2400;

/**
 * Logistic slope (per centipawn). The strong end is Lichess's published
 * centipawn-to-win% fit. The flatter beginner end is an assumption: at low
 * ratings the same evaluation converts into results less reliably, so it is a
 * smaller edge in winning chances. Chess.com does not publish its own curve.
 */
const CP_SLOPE_BEGINNER = 0.0022;
const CP_SLOPE_STRONG = 0.00368208;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/** 0 for beginners, 1 for strong players, linear in between. */
export function ratingStrength(rating: number): number {
  const safe = Number.isFinite(rating) ? rating : DEFAULT_RATING;
  return clamp(
    (safe - BEGINNER_RATING) / (STRONG_RATING - BEGINNER_RATING),
    0,
    1,
  );
}

/**
 * Converts an engine score into expected points for the mover:
 * 1.00 always winning, 0.50 even, 0.00 always losing.
 */
export function expectedPoints(
  score: EngineScore,
  rating: number = DEFAULT_RATING,
): number {
  if ("mate" in score) return score.mate >= 0 ? 1 : 0;
  const slope = lerp(
    CP_SLOPE_BEGINNER,
    CP_SLOPE_STRONG,
    ratingStrength(rating),
  );
  return 1 / (1 + Math.exp(-slope * score.cp));
}

export type OutcomeBand = "losing" | "equal" | "winning";

export function outcomeBand(ep: number): OutcomeBand {
  if (ep >= SPECIAL_MOVE_RULES.winningAtLeast) return "winning";
  if (ep <= SPECIAL_MOVE_RULES.losingAtMost) return "losing";
  return "equal";
}

const BAND_RANK: Record<OutcomeBand, number> = {
  losing: 0,
  equal: 1,
  winning: 2,
};

// ---------------------------------------------------------------------------
// Loss-table classification
// ---------------------------------------------------------------------------

/**
 * Rounds away floating-point noise so a loss that is "exactly 0.10" on paper
 * (e.g. 0.6 - 0.5) lands in the same band every time, and clamps negative
 * losses (the played move out-scored the engine's top line) to zero.
 */
function normalizeLoss(loss: number): number {
  return Math.max(0, Math.round(loss * 1e6) / 1e6);
}

/** Maps expected points lost onto Excellent / Good / Inaccuracy / Mistake / Blunder. */
export function classifyLoss(
  loss: number,
): "excellent" | "good" | "inaccuracy" | "mistake" | "blunder" {
  const normalized = normalizeLoss(loss);
  if (normalized <= REVIEW_THRESHOLDS.excellent) return "excellent";
  if (normalized <= REVIEW_THRESHOLDS.good) return "good";
  if (normalized <= REVIEW_THRESHOLDS.inaccuracy) return "inaccuracy";
  if (normalized <= REVIEW_THRESHOLDS.mistake) return "mistake";
  return "blunder";
}

/**
 * Final precedence step. Callers that already computed the special-move flags
 * can use this directly; `classifyMoveFromEvaluations` computes them for you.
 *
 * Precedence: Book, Forced, Brilliant, Great, Best, Miss, then the loss table.
 */
export function classifyMove(params: {
  loss: number;
  isBook: boolean;
  isBrilliant: boolean;
  isBestMove: boolean;
  isMiss: boolean;
  isGreat?: boolean;
  isForced?: boolean;
}): Classification {
  const {
    loss,
    isBook,
    isBrilliant,
    isBestMove,
    isMiss,
    isGreat = false,
    isForced = false,
  } = params;
  if (isBook) return "book";
  if (isForced) return "forced";
  if (isBrilliant) return "brilliant";
  if (isGreat) return "great";
  if (isBestMove || normalizeLoss(loss) <= REVIEW_THRESHOLDS.bestEpsilon) {
    return "best";
  }
  if (isMiss) return "miss";
  return classifyLoss(loss);
}

// ---------------------------------------------------------------------------
// Special-move detectors
// ---------------------------------------------------------------------------

/**
 * Material from the mover's point of view, in pawns (P=1, N=B=3, R=5, Q=9).
 * `before` is the balance before the move. `after` is the balance at the end of
 * the played move plus the engine's principal variation, taken at a quiet
 * point (after recaptures have played out), otherwise a plain recapture would
 * look like a sacrifice.
 */
export interface MaterialSwing {
  before: number;
  after: number;
}

/** Everything the detectors need, already converted to expected points. */
export interface MoveSignals {
  rating: number;
  /** Expected points after the engine's top move (the value of the position). */
  bestEp: number;
  /** Expected points after the move that was played. */
  playedEp: number;
  /** Expected points lost: bestEp - playedEp, normalized. */
  loss: number;
  isBestMove: boolean;
  /** Expected points after the best alternative to the top move (MultiPV line 2). */
  secondBestEp?: number;
  /** Expected points after the best line that is *not* a sacrifice. */
  alternativeEp?: number;
  /** Expected points the opponent lost with their previous move (0 if unknown). */
  opponentLoss: number;
  /** Plain recaptures are obvious, so they never earn Great. */
  isRecapture: boolean;
  material?: MaterialSwing;
}

export function minSacrificeValue(rating: number): number {
  return rating < SPECIAL_MOVE_RULES.newerPlayerRating
    ? SPECIAL_MOVE_RULES.sacrificeMinNewer
    : SPECIAL_MOVE_RULES.sacrificeMin;
}

export function isPieceSacrifice(
  material: MaterialSwing,
  rating: number = DEFAULT_RATING,
): boolean {
  return material.before - material.after >= minSacrificeValue(rating);
}

/**
 * Brilliant: a good piece sacrifice that is the best or nearly best move.
 * You must not be left in a bad position, and you must not have been
 * completely winning even without the move.
 */
export function isBrilliantMove(signals: MoveSignals): boolean {
  if (!signals.material) return false;
  if (signals.loss > REVIEW_THRESHOLDS.excellent) return false;
  if (signals.playedEp < REVIEW_THRESHOLDS.brilliantEqualOrBetter) return false;
  const withoutTheMove = signals.alternativeEp ?? signals.bestEp;
  if (withoutTheMove >= REVIEW_THRESHOLDS.brilliantNotAlreadyWinning) {
    return false;
  }
  return isPieceSacrifice(signals.material, signals.rating);
}

/**
 * Great: the best move, and critical to the outcome. Either it is the only good
 * move (every alternative is clearly worse), or it lifts the position a whole
 * outcome band (losing to equal, equal to winning) compared with the alternative.
 * Needs a second engine line; without one nothing can be called critical.
 */
export function isGreatMove(signals: MoveSignals): boolean {
  if (!signals.isBestMove || signals.isRecapture) return false;
  if (signals.secondBestEp === undefined) return false;
  // Finding the only move in an already lost position isn't praised.
  if (signals.bestEp <= SPECIAL_MOVE_RULES.losingAtMost) return false;

  const gap = signals.bestEp - signals.secondBestEp;
  const onlyMoveGap = lerp(
    SPECIAL_MOVE_RULES.greatOnlyMoveGapBeginner,
    SPECIAL_MOVE_RULES.greatOnlyMoveGapStrong,
    ratingStrength(signals.rating),
  );
  if (gap >= onlyMoveGap) return true;

  const liftsOutcome =
    BAND_RANK[outcomeBand(signals.bestEp)] >
    BAND_RANK[outcomeBand(signals.secondBestEp)];
  return liftsOutcome && gap >= SPECIAL_MOVE_RULES.greatOutcomeChangeGap;
}

/**
 * Miss: the opponent just made a mistake, a winning position was on offer, and
 * the move played gave it away.
 */
export function isMissMove(signals: MoveSignals): boolean {
  return (
    signals.opponentLoss >= SPECIAL_MOVE_RULES.missMinOpponentLoss &&
    signals.loss > SPECIAL_MOVE_RULES.missMinLoss &&
    signals.bestEp >= SPECIAL_MOVE_RULES.winningAtLeast &&
    signals.playedEp < SPECIAL_MOVE_RULES.winningAtLeast
  );
}

// ---------------------------------------------------------------------------
// High-level entry point
// ---------------------------------------------------------------------------

export interface MoveEvaluationInput {
  /** Score after the engine's top move, mover's point of view. */
  best: EngineScore;
  /** Score after the move actually played, mover's point of view. */
  played: EngineScore;
  /** Score after the engine's second-best move (needs MultiPV >= 2). Enables Great. */
  secondBest?: EngineScore;
  /**
   * Score of the best line that isn't a sacrifice. Optional: Brilliant's "wasn't
   * already completely winning" check falls back to `best` without it.
   */
  bestNonSacrifice?: EngineScore;
  /** Expected points the opponent lost with their previous move. Enables Miss. */
  opponentLoss?: number;
  /** Mover's rating. Defaults to DEFAULT_RATING. */
  rating?: number;
  isBook?: boolean;
  /** Played move equals the engine's top move. Derived from the loss when omitted. */
  isBestMove?: boolean;
  /** Number of legal moves in the position. 1 means Forced. */
  legalMoveCount?: number;
  isRecapture?: boolean;
  /** Material swing over the played line. Enables Brilliant. */
  material?: MaterialSwing;
}

export interface MoveClassificationResult {
  classification: Classification;
  /** Expected points lost by the move, 0 to 1. */
  loss: number;
  bestExpectedPoints: number;
  playedExpectedPoints: number;
}

export interface ClassifyOptions {
  /** Swap in your own score-to-expected-points conversion. */
  toExpectedPoints?: (score: EngineScore, rating: number) => number;
}

/**
 * Classifies one move from engine scores. Detectors for the special classes only
 * fire when the inputs they need are present, so passing just `best` and
 * `played` still gives the full Best-to-Blunder table (plus Book/Forced/Miss
 * when those inputs are given).
 */
export function classifyMoveFromEvaluations(
  input: MoveEvaluationInput,
  options: ClassifyOptions = {},
): MoveClassificationResult {
  const rating = input.rating ?? DEFAULT_RATING;
  const toEp = options.toExpectedPoints ?? expectedPoints;

  const bestEp = toEp(input.best, rating);
  const playedEp = toEp(input.played, rating);
  const loss = normalizeLoss(bestEp - playedEp);
  const isBestMove = input.isBestMove ?? loss <= REVIEW_THRESHOLDS.bestEpsilon;

  const signals: MoveSignals = {
    rating,
    bestEp,
    playedEp,
    loss,
    isBestMove,
    secondBestEp: input.secondBest ? toEp(input.secondBest, rating) : undefined,
    alternativeEp: input.bestNonSacrifice
      ? toEp(input.bestNonSacrifice, rating)
      : undefined,
    opponentLoss: input.opponentLoss ?? 0,
    isRecapture: input.isRecapture ?? false,
    material: input.material,
  };

  const classification = classifyMove({
    loss,
    isBook: input.isBook ?? false,
    isForced: input.legalMoveCount === 1,
    isBrilliant: isBrilliantMove(signals),
    isGreat: isGreatMove(signals),
    isBestMove,
    isMiss: isMissMove(signals),
  });

  return {
    classification,
    loss,
    bestExpectedPoints: bestEp,
    playedExpectedPoints: playedEp,
  };
}
