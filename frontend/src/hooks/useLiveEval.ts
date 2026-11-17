import { useState, useEffect, useRef } from "react";
import { getStockfishEngine } from "../engine/engineManager";
import type { StockfishEngine } from "../engine/StockfishEngine";
import type { EngineEvaluation } from "../engine/StockfishEngine";

/**
 * Lightweight live-eval hook: evaluates the current FEN at low depth
 * whenever it changes, at low cost (~200ms per move).
 */
export function useLiveEval(fen: string, enabled: boolean) {
  const [liveEval, setLiveEval] = useState<{
    fen: string;
    evaluation: EngineEvaluation;
  } | null>(null);
  const engineRef = useRef<StockfishEngine | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      engineRef.current?.cancelCurrent();
      return;
    }
    const requestId = ++requestIdRef.current;
    let cancelled = false;

    (async () => {
      try {
        if (!engineRef.current) {
          engineRef.current = getStockfishEngine();
          await engineRef.current.init();
        }
        const evalResult = await engineRef.current.evaluate(fen, 10);
        if (!cancelled && requestId === requestIdRef.current) {
          setLiveEval({ fen, evaluation: evalResult });
        }
      } catch (err) {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          console.error("[LiveEval] failed:", err);
        }
      }
    })();

    return () => {
      cancelled = true;
      requestIdRef.current = requestId + 1;
      engineRef.current?.cancelCurrent();
    };
  }, [fen, enabled]);

  useEffect(() => () => {
    engineRef.current?.cancelCurrent();
    engineRef.current = null;
  }, []);

  return enabled && liveEval?.fen === fen ? liveEval.evaluation : null;
}
