import type { Chess, Color } from "chess.js";

type MaybeColor = Color | null | undefined;

export type ComputerOutcome = "draw" | "player-win" | "engine-win" | null;

/**
 * `useComputerGame` reports the result as a human-readable sentence. This is
 * the single place that interprets it, so the PGN export and the game-over
 * dialog cannot drift apart. (Ideally the hook would expose a structured
 * outcome and this parser would disappear.)
 */
export function parseComputerResult(text: string): ComputerOutcome {
  if (text.includes("Draw")) return "draw";
  if (text.startsWith("You win")) return "player-win";
  if (text.startsWith("Stockfish wins")) return "engine-win";
  return null;
}

const scoreFor = (winner: MaybeColor) => (winner === "w" ? "1-0" : "0-1");

/** PGN result tag ("1-0", "0-1", "1/2-1/2" or the game's own tag / "*"). */
export function getPgnResult(
  chess: Chess,
  outcome: ComputerOutcome,
  playerColor: MaybeColor,
  computerColor: MaybeColor,
): string {
  // `isDraw()` already covers stalemate and insufficient material.
  if (outcome === "draw" || chess.isDraw()) return "1/2-1/2";
  if (outcome === "player-win") return scoreFor(playerColor);
  if (outcome === "engine-win") return scoreFor(computerColor);
  if (chess.isCheckmate()) return chess.turn() === "w" ? "0-1" : "1-0";
  return chess.header().Result ?? "*";
}

interface GameOverTitleInput {
  outcome: ComputerOutcome;
  isDraw: boolean;
  winnerColor: MaybeColor;
  computerColor: MaybeColor;
}

export function getGameOverTitle({
  outcome,
  isDraw,
  winnerColor,
  computerColor,
}: GameOverTitleInput): "Draw" | "Defeat" | "Victory" {
  if (outcome === "draw" || isDraw) return "Draw";
  if (outcome === "engine-win" || winnerColor === computerColor) return "Defeat";
  return "Victory";
}
