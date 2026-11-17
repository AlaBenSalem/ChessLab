import { StockfishEngine } from "./StockfishEngine";

let sharedEngine: StockfishEngine | null = null;

/** One lazily-created Stockfish worker shared by live eval and game review. */
export function getStockfishEngine(): StockfishEngine {
  if (!sharedEngine) sharedEngine = new StockfishEngine();
  return sharedEngine;
}

export async function disposeStockfishEngine(): Promise<void> {
  const engine = sharedEngine;
  sharedEngine = null;
  if (engine) await engine.dispose();
}
