export type MoveClassGroup = "good" | "bad";

interface MoveClassDefinition {
  id: string;
  label: string;
  group: MoveClassGroup;
  color: string;
  icon: string;
  /** Display order, matching Chess.com's review summary (Forced is not listed there). */
  order: number;
  /** Tooltip / legend copy. */
  description: string;
  /** Annotation suffix for move lists and PGN ("!!", "?!", ...). Empty when none is shown. */
  symbol: string;
  /** Completes the coach-style sentence "<move> is ...". */
  coachPhrase: string;
}

export const MOVE_CLASS_LIST = [
  {
    id: "brilliant",
    label: "Brilliant",
    group: "good",
    color: "#12b8ad",
    icon: "brilliant",
    order: 0,
    description:
      "A good piece sacrifice: the best or nearly best move, it doesn't leave you worse, and you weren't already completely winning.",
    symbol: "!!",
    coachPhrase: "brilliant",
  },
  {
    id: "great",
    label: "Great",
    group: "good",
    color: "#6e9fbe",
    icon: "great",
    order: 1,
    description:
      "A critical move: it finds the only good option, or turns a losing position into an equal one or an equal one into a winning one.",
    symbol: "!",
    coachPhrase: "great",
  },
  {
    id: "best",
    label: "Best",
    group: "good",
    color: "#82b64b",
    icon: "best",
    order: 2,
    description: "The engine's top choice.",
    symbol: "",
    coachPhrase: "best",
  },
  {
    id: "excellent",
    label: "Excellent",
    group: "good",
    color: "#95bd55",
    icon: "excellent",
    order: 3,
    description: "Almost as strong as the best move.",
    symbol: "",
    coachPhrase: "excellent",
  },
  {
    id: "good",
    label: "Good",
    group: "good",
    color: "#91a984",
    icon: "good",
    order: 4,
    description: "A reasonable move that gives up very little.",
    symbol: "",
    coachPhrase: "good",
  },
  {
    id: "book",
    label: "Book",
    group: "good",
    color: "#a88764",
    icon: "book",
    order: 5,
    description: "A known opening-theory move.",
    symbol: "",
    coachPhrase: "a book move",
  },
  {
    id: "forced",
    label: "Forced",
    group: "good",
    color: "#91a984",
    icon: "forced",
    order: 6,
    description: "The only legal move.",
    symbol: "",
    coachPhrase: "forced",
  },
  {
    id: "inaccuracy",
    label: "Inaccuracy",
    group: "bad",
    color: "#f3bd36",
    icon: "inaccuracy",
    order: 7,
    description: "A small slip that costs some of your winning chances.",
    symbol: "?!",
    coachPhrase: "an inaccuracy",
  },
  {
    id: "mistake",
    label: "Mistake",
    group: "bad",
    color: "#e89032",
    icon: "mistake",
    order: 8,
    description:
      "A clear error that gives up a meaningful part of your advantage.",
    symbol: "?",
    coachPhrase: "a mistake",
  },
  {
    id: "miss",
    label: "Miss",
    group: "bad",
    color: "#f06c62",
    icon: "miss",
    order: 9,
    description:
      "Fails to capitalize on your opponent's mistake and lets a winning chance slip away.",
    symbol: "",
    coachPhrase: "a miss",
  },
  {
    id: "blunder",
    label: "Blunder",
    group: "bad",
    color: "#c93636",
    icon: "blunder",
    order: 10,
    description: "A serious error that sharply reduces your winning chances.",
    symbol: "??",
    coachPhrase: "a blunder",
  },
] as const satisfies readonly MoveClassDefinition[];

export type MoveClass = (typeof MOVE_CLASS_LIST)[number]["id"];
export type MoveClassIcon = (typeof MOVE_CLASS_LIST)[number]["icon"];
export type MoveClassConfig = (typeof MOVE_CLASS_LIST)[number];

export const MOVE_CLASSES = Object.fromEntries(
  MOVE_CLASS_LIST.map((moveClass) => [moveClass.id, moveClass]),
) as Record<MoveClass, MoveClassConfig>;

/** Classes shown in the review summary table (everything except Forced), in display order. */
export const REVIEW_SUMMARY_CLASSES: readonly MoveClass[] =
  MOVE_CLASS_LIST.filter((moveClass) => moveClass.id !== "forced").map(
    (moveClass) => moveClass.id,
  );

/**
 * Classes that count as errors (Inaccuracy, Mistake, Miss, Blunder). Derived from
 * `group` so it cannot drift from the class list.
 */
export const ERROR_CLASSES: readonly MoveClass[] = MOVE_CLASS_LIST.filter(
  (moveClass) => moveClass.group === "bad",
).map((moveClass) => moveClass.id);

/** Runtime type guard for untrusted values (saved reviews, URL params, API payloads). */
export function isMoveClass(value: unknown): value is MoveClass {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(MOVE_CLASSES, value)
  );
}

/** True for Inaccuracy, Mistake, Miss and Blunder. */
export function isErrorClass(kind: MoveClass): boolean {
  return MOVE_CLASSES[kind].group === "bad";
}

/**
 * Tallies classes for the review summary. Every class is present in the result
 * (zero when unused), so the summary table can render without missing-key checks.
 */
export function countMoveClasses(
  kinds: Iterable<MoveClass>,
): Record<MoveClass, number> {
  const counts = Object.fromEntries(
    MOVE_CLASS_LIST.map((moveClass) => [moveClass.id, 0]),
  ) as Record<MoveClass, number>;
  for (const kind of kinds) counts[kind] += 1;
  return counts;
}

/**
 * Coach-style sentence, e.g. describeMove("Qxf7+", "blunder") -> "Qxf7+ is a blunder".
 * When a better move is supplied, error classes also name it:
 * describeMove("Qxf7+", "blunder", "Qd1") -> "Qxf7+ is a blunder. Best was Qd1".
 */
export function describeMove(
  san: string,
  kind: MoveClass,
  bestSan?: string,
): string {
  const sentence = `${san} is ${MOVE_CLASSES[kind].coachPhrase}`;
  if (bestSan && bestSan !== san && isErrorClass(kind)) {
    return `${sentence}. Best was ${bestSan}`;
  }
  return sentence;
}
