// 🔴 Tell Vite to treat these as raw URLs
import stockfishJsUrl from "./stockfish.js?url";
import stockfishWasmUrl from "./stockfish.wasm?url";
import { Chess } from "chess.js";

// Keep the engine's companion WASM file in Vite's emitted assets.
void stockfishWasmUrl;

export interface EngineEvaluation {
  depth: number;
  scoreType: "cp" | "mate";
  scoreValue: number;
  bestMove: string;
  lines: EngineLine[];
}

export interface EngineLine {
  depth: number;
  cp: number;
  mate: number | null;
  move: string;
  pv: string[];
}

export interface EvaluateOptions {
  searchMove?: string;
  nodes?: number;
  elo?: number;
  skillLevel?: number;
  /**
   * Time budget for this search (default 10s). When it runs out the engine is
   * told to stop and the best result found so far is returned; check
   * `depth` on the result if you need to know how deep it got.
   */
  timeoutMs?: number;
}

export interface StockfishEngineOptions {
  /** Log every UCI line from the engine. Very noisy, so off by default. */
  debug?: boolean;
  /** How long the engine gets to answer `stop` before it is restarted. Default 3s. */
  stopGraceMs?: number;
}

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_STOP_GRACE_MS = 3_000;
const STARTUP_TIMEOUT_MS = 15_000;
const FULL_STRENGTH_SKILL = 20;

const abortError = () => new DOMException("Aborted", "AbortError");

export function terminalEvaluation(fen: string): EngineEvaluation | null {
  const chess = new Chess(fen);
  if (chess.isCheckmate()) {
    return {
      depth: 0,
      scoreType: "mate",
      scoreValue: 0,
      bestMove: "",
      lines: [],
    };
  }
  if (chess.isDraw() || chess.isStalemate()) {
    return {
      depth: 0,
      scoreType: "cp",
      scoreValue: 0,
      bestMove: "",
      lines: [],
    };
  }
  return null;
}

interface ActiveSearch {
  promise: Promise<EngineEvaluation>;
  cancel: () => void;
}

export class StockfishEngine {
  private worker!: Worker;
  private readyPromise!: Promise<void>;
  /** Tears down the current worker. Set by spawn(). */
  private discardWorker!: (reason: Error) => void;
  private activeSearch: ActiveSearch | null = null;
  /** Searches run strictly one at a time, in the order they were requested. */
  private queue: Promise<unknown> = Promise.resolve();
  /** Id of the newest evaluate() call. Older calls that haven't started yet are dropped. */
  private latestRequest = 0;
  private disposed = false;
  /** Engine options already sent to the current worker (it forgets them on restart). */
  private applied: { skill: number; elo: number | undefined } = {
    skill: FULL_STRENGTH_SKILL,
    elo: undefined,
  };
  private readonly debug: boolean;
  private readonly stopGraceMs: number;

  constructor(options: StockfishEngineOptions = {}) {
    this.debug = options.debug ?? false;
    this.stopGraceMs = options.stopGraceMs ?? DEFAULT_STOP_GRACE_MS;
    this.spawn();
  }

  public async init(): Promise<void> {
    return this.ensureReady();
  }

  public async evaluate(
    fen: string,
    depth: number = 12,
    options: EvaluateOptions = {},
  ): Promise<EngineEvaluation> {
    const terminal = terminalEvaluation(fen);
    if (terminal) return terminal;
    if (this.disposed) throw new Error("Engine has been disposed");

    const chess = new Chess(fen);
    if (
      options.searchMove &&
      !chess
        .moves({ verbose: true })
        .some(
          (move) =>
            `${move.from}${move.to}${move.promotion ?? ""}` ===
            options.searchMove,
        )
    ) {
      throw new Error(`Illegal constrained search move: ${options.searchMove}`);
    }

    // Everything up to `return run` happens synchronously, so concurrent callers
    // are ordered exactly as they called. The newest request wins: it stops the
    // running search, and any older request still waiting its turn is dropped.
    const id = ++this.latestRequest;
    this.cancelCurrent();
    const run = this.queue.then(() => this.run(id, fen, depth, options));
    this.queue = run.catch(() => undefined);
    return run;
  }

  public cancelCurrent(): void {
    this.activeSearch?.cancel();
  }

  public async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    this.latestRequest++; // drops anything still queued
    const active = this.activeSearch;
    active?.cancel();
    await active?.promise.catch(() => undefined);
    this.discardWorker(new Error("Engine has been disposed"));
  }

  // -------------------------------------------------------------------------
  // Worker lifecycle
  // -------------------------------------------------------------------------

  private spawn(): void {
    const worker = new Worker(stockfishJsUrl);
    this.worker = worker;
    this.applied = { skill: FULL_STRENGTH_SKILL, elo: undefined };

    let resolveReady!: () => void;
    let rejectReady!: (reason: Error) => void;
    const ready = new Promise<void>((resolve, reject) => {
      resolveReady = resolve;
      rejectReady = reject;
    });
    // Callers see the rejection when they await it; this only stops it being
    // reported as unhandled while nobody is awaiting yet.
    ready.catch(() => undefined);
    this.readyPromise = ready;

    const startupTimer = setTimeout(
      () => rejectReady(new Error("Stockfish did not start in time")),
      STARTUP_TIMEOUT_MS,
    );
    this.discardWorker = (reason) => {
      clearTimeout(startupTimer);
      rejectReady(reason); // no-op when it already resolved
      worker.onmessage = null;
      worker.onerror = null;
      worker.terminate();
    };

    worker.onmessage = (e) => {
      const line = e.data;
      if (this.debug) console.log("[Stockfish]", line);
      if (line === "uciok") {
        worker.postMessage("setoption name MultiPV value 2");
        worker.postMessage("isready");
      } else if (line === "readyok") {
        clearTimeout(startupTimer);
        resolveReady();
      }
    };

    worker.onerror = (err) => {
      const message = err.message || "unknown error";
      console.error("[Stockfish Worker Error]", message);
      // A worker that threw is not trustworthy any more (every later search would
      // just sit there until it timed out), so replace it.
      if (this.worker === worker) {
        this.restart(new Error(`Stockfish worker crashed: ${message}`));
      }
    };

    worker.postMessage("uci");
  }

  private restart(reason: Error): void {
    if (this.disposed) return;
    this.discardWorker(reason);
    this.spawn();
  }

  private async ensureReady(): Promise<void> {
    for (let attempt = 0; ; attempt++) {
      const worker = this.worker;
      try {
        await this.readyPromise;
        return;
      } catch (err) {
        if (this.disposed || attempt >= 2) throw err;
        // Only replace the worker that actually failed; it may already be replaced.
        if (this.worker === worker) {
          this.restart(err instanceof Error ? err : new Error(String(err)));
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Searching
  // -------------------------------------------------------------------------

  private async run(
    id: number,
    fen: string,
    depth: number,
    options: EvaluateOptions,
  ): Promise<EngineEvaluation> {
    if (this.disposed) throw new Error("Engine has been disposed");
    if (id !== this.latestRequest) throw abortError();
    await this.ensureReady();
    // A newer request may have arrived while the engine was starting up.
    if (this.disposed) throw new Error("Engine has been disposed");
    if (id !== this.latestRequest) throw abortError();

    // No awaits from here to the point activeSearch is set, so nothing can
    // slip in between. The previous search has fully finished (its `bestmove`
    // was received, or the worker was replaced), so the engine is idle.
    this.applyStrength(options);
    const search = this.startSearch(fen, depth, options);
    this.activeSearch = search;
    try {
      return await search.promise;
    } finally {
      if (this.activeSearch === search) this.activeSearch = null;
    }
  }

  /**
   * Strength options are sticky inside Stockfish, so every search states what it
   * wants: no `skillLevel` / `elo` means full strength, not "whatever the last
   * caller left behind".
   */
  private applyStrength(options: EvaluateOptions): void {
    const skill =
      options.skillLevel === undefined
        ? FULL_STRENGTH_SKILL
        : Math.max(0, Math.min(20, options.skillLevel));
    const elo =
      options.elo === undefined
        ? undefined
        : Math.max(1320, Math.min(3190, options.elo));

    if (skill !== this.applied.skill) {
      this.worker.postMessage(`setoption name Skill Level value ${skill}`);
    }
    if (elo !== this.applied.elo) {
      if (elo === undefined) {
        this.worker.postMessage("setoption name UCI_LimitStrength value false");
      } else {
        if (this.applied.elo === undefined) {
          this.worker.postMessage(
            "setoption name UCI_LimitStrength value true",
          );
        }
        this.worker.postMessage(`setoption name UCI_Elo value ${elo}`);
      }
    }
    this.applied = { skill, elo };
  }

  private startSearch(
    fen: string,
    depth: number,
    options: EvaluateOptions,
  ): ActiveSearch {
    const worker = this.worker;
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    let cancel: () => void = () => {};

    const promise = new Promise<EngineEvaluation>((resolve, reject) => {
      const lastEval: Partial<EngineEvaluation> = {};
      const lines = new Map<number, EngineLine>();
      let done = false;
      let stopReason: "abort" | "timeout" | null = null;
      let softTimer: ReturnType<typeof setTimeout> | undefined;
      let graceTimer: ReturnType<typeof setTimeout> | undefined;

      const finish = (settle: () => void) => {
        if (done) return;
        done = true;
        clearTimeout(softTimer);
        clearTimeout(graceTimer);
        worker.removeEventListener("message", onMessage);
        worker.removeEventListener("error", onError);
        settle();
      };

      // Ask the engine to stop and wait for its `bestmove`. The next search must
      // not start before that arrives, otherwise this search's leftovers would be
      // mistaken for the next position's answer.
      const requestStop = (reason: "abort" | "timeout") => {
        if (done) return;
        const alreadyStopping = stopReason !== null;
        if (stopReason !== "abort") stopReason = reason;
        if (alreadyStopping) return;
        worker.postMessage("stop");
        graceTimer = setTimeout(() => {
          // The engine ignored `stop`: it is wedged. Replace it so searches
          // queued behind this one don't hang as well.
          finish(() =>
            reject(
              stopReason === "abort"
                ? abortError()
                : new Error("Engine stopped responding and was restarted"),
            ),
          );
          if (this.worker === worker) {
            this.restart(new Error("Engine stopped responding"));
          }
        }, this.stopGraceMs);
      };

      const onError = (err: Event) => {
        const message = (err as ErrorEvent).message || "unknown error";
        finish(() => reject(new Error(`Stockfish worker error: ${message}`)));
      };

      const onMessage = (e: MessageEvent) => {
        const line = e.data;
        if (typeof line !== "string") return;

        if (
          line.startsWith("info") &&
          line.includes("score") &&
          !line.includes("lowerbound") &&
          !line.includes("upperbound")
        ) {
          const depthMatch = line.match(/depth (\d+)/);
          const cpMatch = line.match(/score cp (-?\d+)/);
          const mateMatch = line.match(/score mate (-?\d+)/);
          const rankMatch = line.match(/multipv (\d+)/);
          const rank = rankMatch ? Number(rankMatch[1]) : 1;
          const pvIndex = line.indexOf(" pv ");
          const pv =
            pvIndex >= 0
              ? line
                  .slice(pvIndex + 4)
                  .trim()
                  .split(/\s+/)
              : [];
          if (!pv.length) return;

          if (depthMatch && rank === 1)
            lastEval.depth = parseInt(depthMatch[1]);
          let cp = 0;
          let mate: number | null = null;
          if (cpMatch) {
            cp = parseInt(cpMatch[1]);
          }
          if (mateMatch) {
            mate = parseInt(mateMatch[1]);
            cp = (mate > 0 ? 1 : -1) * (100_000 - Math.min(Math.abs(mate), 99));
          }
          const scoreType = mate === null ? "cp" : "mate";
          lines.set(rank, {
            depth: depthMatch ? Number(depthMatch[1]) : 0,
            cp,
            mate,
            move: pv[0],
            pv,
          });
          if (rank === 1) {
            lastEval.scoreType = scoreType;
            lastEval.scoreValue = mate === null ? cp : mate;
            lastEval.bestMove = pv[0];
          }
        }

        if (line.startsWith("bestmove")) {
          finish(() => {
            if (stopReason === "abort") return reject(abortError());
            const bestMove = line.split(/\s+/)[1];
            if (!bestMove || bestMove === "(none)" || !lastEval.scoreType) {
              return reject(
                new Error(
                  stopReason === "timeout"
                    ? `Engine produced no result within ${timeoutMs} ms`
                    : "Engine returned no best move",
                ),
              );
            }
            // After a timeout this is the best the engine had found when stopped.
            resolve({
              ...lastEval,
              bestMove,
              lines: [...lines.entries()]
                .sort(([a], [b]) => a - b)
                .map(([, entry]) => entry)
                .filter((entry) => entry.depth === lastEval.depth),
            } as EngineEvaluation);
          });
        }
      };

      cancel = () => requestStop("abort");

      worker.addEventListener("message", onMessage);
      worker.addEventListener("error", onError);
      softTimer = setTimeout(() => requestStop("timeout"), timeoutMs);

      worker.postMessage(`position fen ${fen}`);
      const limit = options.nodes ? `nodes ${options.nodes}` : `depth ${depth}`;
      const searchMoves = options.searchMove
        ? ` searchmoves ${options.searchMove}`
        : "";
      worker.postMessage(`go ${limit}${searchMoves}`);
    });

    return { promise, cancel: () => cancel() };
  }
}
