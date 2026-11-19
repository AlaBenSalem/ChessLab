import { useMemo, useState, useRef, useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  Bell,
  Clock,
  Cpu,
  FastForward,
  FileDown,
  Flag,
  FlipHorizontal2,
  Gauge,
  Play,
  RotateCcw,
  Rewind,
  Swords,
  Trophy,
  User,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { Color, PieceSymbol, Square } from "chess.js";
import { Chess } from "chess.js";
import { StockfishEngine } from "../../engine/StockfishEngine";
import { getPiecesFromBoard } from "../../lib/boardUtils";
import { toWhitePov } from "../../lib/accuracy";
import type { MoveClass } from "../../lib/moveClasses";
import { FILES, RANKS } from "../../types/chess";
import { useGameStore } from "../../store/gameStore";
import { useMute } from "../../hooks/useMute";
import { useGameAnalysis } from "../../hooks/useGameAnalysis";
import { useLiveEval } from "../../hooks/useLiveEval";
import {
  getOpeningForMoves,
  isBookLoaded,
  loadOpeningBook,
} from "../../lib/openingBook";
import { AnalysisPanel } from "./AnalysisPanel";
import { PgnExportButton } from "./PgnExportButton";
import { EvalBar } from "../EvalBar/EvalBarr";
import { MoveBadge } from "../badges/MoveBadge";
import {
  SQUARE_SIZE,
  KING_HIGHLIGHT,
  findKingSquare,
  getDrawReason,
  type KingRole,
} from "./helpers";

/* ────────────────────────────────────────────────────────────────────────────
   Config
──────────────────────────────────────────────────────────────────────────── */

type Difficulty = "Beginner" | "Easy" | "Medium" | "Hard" | "Expert" | "Master";
type TimeControl = "Unlimited" | "1+0" | "3+0" | "5+0" | "10+0" | "15+10";

const ENGINE_STRENGTH: Record<
  Difficulty,
  { elo: number; skill: number; depth: number }
> = {
  Beginner: { elo: 1320, skill: 0, depth: 3 },
  Easy: { elo: 1320, skill: 2, depth: 5 },
  Medium: { elo: 1400, skill: 6, depth: 8 },
  Hard: { elo: 1800, skill: 11, depth: 10 },
  Expert: { elo: 2200, skill: 16, depth: 12 },
  Master: { elo: 2800, skill: 20, depth: 16 },
};
const DIFFICULTY_RANGE: Record<Difficulty, string> = {
  Beginner: "400–800",
  Easy: "800–1000",
  Medium: "1000–1400",
  Hard: "1400–1800",
  Expert: "1800–2200",
  Master: "2200+",
};
const TIME_CONTROLS: Record<TimeControl, [number, number]> = {
  Unlimited: [0, 0],
  "1+0": [60, 0],
  "3+0": [180, 0],
  "5+0": [300, 0],
  "10+0": [600, 0],
  "15+10": [900, 10],
};
const clockText = (seconds: number) =>
  `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0")}`;

/* ────────────────────────────────────────────────────────────────────────────
   Shared styles
──────────────────────────────────────────────────────────────────────────── */

const PANEL = "rounded-xl bg-[#2a2a2a]";
const PRIMARY_BTN =
  "flex w-full items-center justify-center gap-2 rounded-xl border-b-4 border-emerald-700 bg-emerald-500 px-4 py-3.5 text-lg font-extrabold text-white transition-colors hover:bg-emerald-400 active:translate-y-px active:border-b-2 disabled:opacity-50";
const SECONDARY_BTN =
  "rounded-lg bg-white/10 px-3 py-2.5 text-[15px] font-semibold text-stone-100 transition-colors hover:bg-white/15";
const optionClass = (active: boolean) =>
  `rounded-lg border px-3 py-3 text-[15px] font-semibold transition-colors ${
    active
      ? "border-emerald-400 bg-emerald-400/15 text-white"
      : "border-white/10 bg-white/5 text-stone-300 hover:bg-white/10"
  }`;

const pieceSrc = (color: Color, type: PieceSymbol) =>
  `/pieces/${color}${type.toUpperCase()}.svg`;

/* ────────────────────────────────────────────────────────────────────────────
   Small presentational components
──────────────────────────────────────────────────────────────────────────── */

function RailButton({
  label,
  onClick,
  active,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg transition-colors disabled:opacity-30 ${
        active
          ? "bg-white/10 text-white"
          : "text-stone-500 hover:bg-white/5 hover:text-stone-200"
      }`}
    >
      {children}
    </button>
  );
}

function NavButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="grid h-12 flex-1 place-items-center rounded-lg text-stone-300 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

function ClockBox({
  text,
  running,
  low,
}: {
  text: string;
  running: boolean;
  low: boolean;
}) {
  return (
    <div
      className={`flex h-[72px] shrink-0 items-center justify-end gap-3 rounded-lg px-5 font-semibold tabular-nums transition-colors ${
        running ? "bg-[#262626] text-white" : "bg-[#6b6b6b] text-stone-100"
      }`}
      aria-label={`Clock ${text}`}
    >
      {running && (
        <Clock
          size={32}
          strokeWidth={2.4}
          className={`mr-auto ${low ? "text-red-400" : "text-emerald-400"}`}
        />
      )}
      <span
        className={`text-[46px] leading-none tracking-wide ${low ? "text-red-400" : ""}`}
      >
        {text}
      </span>
    </div>
  );
}

type PlayerRowProps = {
  color: Color;
  name: string;
  rating: string;
  engine: boolean;
  captured: { color: Color; type: PieceSymbol }[];
  advantage: number;
  winner: boolean;
};

function PlayerRow({
  color,
  name,
  rating,
  engine,
  captured,
  advantage,
  winner,
}: PlayerRowProps) {
  return (
    <div className="flex items-center gap-3 py-3.5">
      <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-[#3b3b3b]">
        {engine ? (
          <Cpu size={30} className="text-stone-300" />
        ) : (
          <img
            src={pieceSrc(color, "k")}
            alt=""
            aria-hidden
            className="h-11 w-11"
            draggable={false}
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[17px] font-bold leading-tight text-stone-50">
          {name}{" "}
          <span className="font-semibold text-stone-400">({rating})</span>
        </p>
        <div className="mt-1.5 flex h-5 items-center pl-1">
          {captured.map((piece, index) => (
            <img
              key={index}
              src={pieceSrc(piece.color, piece.type)}
              alt=""
              aria-hidden
              className="-ml-1 h-5 w-5"
              draggable={false}
            />
          ))}
        </div>
      </div>
      <div className="flex w-12 shrink-0 justify-end text-2xl font-bold text-stone-50">
        {winner ? (
          <Trophy size={24} className="text-amber-400" aria-label="Winner" />
        ) : advantage > 0 ? (
          `+${advantage}`
        ) : null}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Board
──────────────────────────────────────────────────────────────────────────── */

export function Board() {
  const {
    chess,
    fen,
    selectedSquare,
    legalMoves,
    moves,
    viewIndex,
    selectSquare,
    movePiece,
    resetGame,
    setViewIndex,
    previousMove,
    nextMove,
    undoMove,
    lastMoveInHistory,
    loadPgn,
  } = useGameStore();

  const { muted, toggleMute } = useMute();
  const [isFlipped, setIsFlipped] = useState(false);
  const [showEval, setShowEval] = useState(true);
  const [computerMode, setComputerMode] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [openingBookReady, setOpeningBookReady] = useState(isBookLoaded());
  const [playerColor, setPlayerColor] = useState<Color>("w");
  const computerColor: Color = playerColor === "w" ? "b" : "w";
  const [colorChoice, setColorChoice] = useState<"w" | "b" | "random">("w");
  const [difficulty, setDifficulty] = useState<Difficulty>("Medium");
  const [timeControl, setTimeControl] = useState<TimeControl>("10+0");
  const [engineReady, setEngineReady] = useState(false);
  const [engineSession, setEngineSession] = useState(0);
  const [engineThinking, setEngineThinking] = useState(false);
  const [engineMessage, setEngineMessage] = useState("Ready");
  const [computerResult, setComputerResult] = useState("");
  const [computerClocks, setComputerClocks] = useState<[number, number]>([
    600, 600,
  ]);
  const [gameStartedAt, setGameStartedAt] = useState<number | null>(null);
  const [gameDuration, setGameDuration] = useState(0);
  const [promotionRequest, setPromotionRequest] = useState<{
    from: Square;
    to: Square;
  } | null>(null);
  const [engineError, setEngineError] = useState("");
  const [pgnOpen, setPgnOpen] = useState(false);
  const [pgnInput, setPgnInput] = useState("");
  const [pgnError, setPgnError] = useState<string | null>(null);
  const engineRef = useRef<StockfishEngine | null>(null);
  const observedPly = useRef(0);
  const moveListRef = useRef<HTMLDivElement | null>(null);
  const computerGameOver = !!computerResult || chess.isGameOver();
  const computerTurn =
    computerMode && gameStarted && chess.turn() !== playerColor;
  const canHumanMove =
    !computerMode ||
    (gameStarted &&
      !computerGameOver &&
      !engineThinking &&
      chess.turn() === playerColor);
  const analysis = useGameAnalysis(chess, fen);
  const { isAnalyzing, result } = analysis;

  useEffect(() => {
    let active = true;
    void loadOpeningBook().then(() => {
      if (active) setOpeningBookReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const liveEval = useLiveEval(fen, !analysis.busy);

  const activePly = viewIndex;
  const viewingHistory = viewIndex < moves.length - 1;
  const displayChess = useMemo(() => {
    const position = new Chess(chess.header().FEN ?? new Chess().fen());
    for (let index = 0; index <= viewIndex; index++)
      position.move(moves[index]);
    return position;
  }, [chess, moves, viewIndex]);
  const displayFen = displayChess.fen();
  const displayLastMove = viewIndex >= 0 ? (moves[viewIndex] ?? null) : null;
  const displayLegalMoves = viewingHistory ? [] : legalMoves;
  const displayRanks = isFlipped ? [...RANKS].reverse() : RANKS;
  const displayFiles = isFlipped ? [...FILES].reverse() : FILES;
  const capturedBy = useMemo(() => {
    const captures: Record<Color, { color: Color; type: PieceSymbol }[]> = {
      w: [],
      b: [],
    };
    moves.slice(0, viewIndex + 1).forEach((move) => {
      if (!move.captured) return;
      const capturedColor: Color = move.color === "w" ? "b" : "w";
      captures[move.color].push({ color: capturedColor, type: move.captured });
    });
    return captures;
  }, [moves, viewIndex]);
  const materialDifference = displayChess
    .board()
    .flat()
    .reduce((difference, piece) => {
      if (!piece || piece.type === "k") return difference;
      const value =
        piece.type === "q"
          ? 9
          : piece.type === "r"
            ? 5
            : piece.type === "b" || piece.type === "n"
              ? 3
              : 1;
      return difference + (piece.color === "w" ? value : -value);
    }, 0);

  const movePairs = useMemo(() => {
    const rows: { number: number; white: number; black: number | null }[] = [];
    for (let ply = 0; ply < moves.length; ply += 2) {
      rows.push({
        number: ply / 2 + 1,
        white: ply,
        black: ply + 1 < moves.length ? ply + 1 : null,
      });
    }
    return rows;
  }, [moves.length]);

  const startComputerGame = () => {
    analysis.cancelAnalysis();
    const side =
      colorChoice === "random"
        ? Math.random() < 0.5
          ? "w"
          : "b"
        : colorChoice;
    const startSeconds = TIME_CONTROLS[timeControl][0];
    resetGame();
    observedPly.current = 0;
    setPlayerColor(side);
    setComputerMode(true);
    setGameStarted(true);
    setEngineReady(false);
    setEngineSession((session) => session + 1);
    setSetupOpen(false);
    setComputerResult("");
    setEngineError("");
    setComputerClocks([startSeconds, startSeconds]);
    setGameStartedAt(Date.now());
    setGameDuration(0);
    setEngineThinking(side === "b");
    setEngineMessage("Loading Stockfish…");
  };
  const exitComputerGame = () => {
    engineRef.current?.cancelCurrent();
    setComputerMode(false);
    setGameStarted(false);
    setEngineReady(false);
    setSetupOpen(false);
    setEngineThinking(false);
    setComputerResult("");
  };
  const moveWithPromotion = (from: Square, to: Square) => {
    if (!canHumanMove) return false;
    const candidateMoves = chess
      .moves({ square: from, verbose: true })
      .filter((move) => move.to === to);
    if (!candidateMoves.length) return false;
    if (candidateMoves.some((move) => move.promotion)) {
      setPromotionRequest({ from, to });
      return true;
    }
    return movePiece(from, to);
  };
  const offerDraw = async () => {
    const engine = engineRef.current;
    if (
      !engine ||
      engineThinking ||
      computerGameOver ||
      chess.turn() !== playerColor
    )
      return;
    setEngineThinking(true);
    setEngineMessage("Considering draw offer…");
    try {
      const strength = ENGINE_STRENGTH[difficulty];
      const answer = await engine.evaluate(fen, strength.depth, {
        elo: strength.elo,
        skillLevel: strength.skill,
      });
      if (
        answer.scoreType === "mate"
          ? answer.scoreValue >= 0
          : answer.scoreValue >= -60
      ) {
        setComputerResult("Draw by agreement");
      } else {
        setEngineMessage("Stockfish declined the draw");
      }
    } catch {
      setEngineError("Could not evaluate the draw offer.");
    } finally {
      setEngineThinking(false);
    }
  };

  const handleLoadPgn = () => {
    analysis.cancelAnalysis();
    const err = loadPgn(pgnInput);
    if (err) {
      setPgnError(err);
    } else {
      setPgnOpen(false);
      setPgnInput("");
      setPgnError(null);
    }
  };

  const buildExportPgn = () => {
    const startFen = chess.header().FEN;
    const exported = startFen ? new Chess(startFen) : new Chess();
    const headers = chess.header();
    const exportOpening = openingBookReady
      ? getOpeningForMoves(moves.map((move) => move.san))
      : null;
    const playerName = (color: Color) => {
      if (computerMode) return color === playerColor ? "You" : "Stockfish";
      const name = color === "w" ? headers.White : headers.Black;
      return name && name !== "?" ? name : color === "w" ? "White" : "Black";
    };
    let resultTag = headers.Result ?? "*";
    if (computerResult.includes("Draw") || chess.isDraw()) resultTag = "1/2-1/2";
    else if (computerResult.startsWith("You win")) resultTag = playerColor === "w" ? "1-0" : "0-1";
    else if (computerResult.startsWith("Stockfish wins")) resultTag = computerColor === "w" ? "1-0" : "0-1";
    else if (chess.isCheckmate()) resultTag = chess.turn() === "w" ? "0-1" : "1-0";
    else if (chess.isStalemate() || chess.isInsufficientMaterial()) resultTag = "1/2-1/2";

    const now = new Date();
    const date = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}`;
    exported.header(
      "Event", computerMode ? "Play vs Computer" : "Casual Game",
      "Site", "ChessLab",
      "Date", date,
      "Round", "-",
      "White", playerName("w"),
      "Black", playerName("b"),
      "Result", resultTag,
    );
    if (startFen) exported.header("SetUp", "1", "FEN", startFen);
    const eco = exportOpening?.eco ?? headers.ECO;
    const openingName = exportOpening?.name ?? headers.Opening;
    if (eco) exported.header("ECO", eco);
    if (openingName) exported.header("Opening", openingName);
    if (computerMode && timeControl !== "Unlimited") {
      const [base, increment] = TIME_CONTROLS[timeControl];
      exported.header("TimeControl", `${base}+${increment}`);
    }
    chess.history({ verbose: true }).forEach((move) => {
      exported.move({ from: move.from, to: move.to, promotion: move.promotion });
    });
    return exported.pgn({ maxWidth: 80, newline: "\n" });
  };

  useEffect(() => {
    if (!computerMode || !gameStarted) return;
    const engine = new StockfishEngine();
    engineRef.current = engine;
    void engine
      .init()
      .then(() => {
        setEngineReady(true);
        setEngineMessage("Stockfish ready");
      })
      .catch(() => {
        setEngineError(
          "Stockfish failed to load. Exit the computer game or restart it.",
        );
        setEngineMessage("Engine unavailable");
      });
    return () => {
      engineRef.current = null;
      void engine.dispose();
    };
  }, [computerMode, gameStarted, engineSession]);

  useEffect(() => {
    if (
      !computerMode ||
      !gameStarted ||
      !engineReady ||
      computerGameOver ||
      !computerTurn ||
      !engineRef.current
    )
      return;
    let cancelled = false;
    setEngineThinking(true);
    setEngineMessage("Stockfish is thinking…");
    const strength = ENGINE_STRENGTH[difficulty];
    void engineRef.current
      .evaluate(fen, strength.depth, {
        elo: strength.elo,
        skillLevel: strength.skill,
      })
      .then((answer) => {
        if (cancelled) return;
        const uci = answer.bestMove;
        if (!uci || uci === "(none)") {
          setEngineError("Stockfish did not return a move.");
          return;
        }
        const promotion = (uci[4] as "q" | "r" | "b" | "n" | undefined) ?? "q";
        if (
          !movePiece(
            uci.slice(0, 2) as Square,
            uci.slice(2, 4) as Square,
            promotion,
          )
        ) {
          setEngineError(
            "Stockfish returned an illegal move. Restart the computer game.",
          );
        }
        setEngineThinking(false);
        setEngineMessage("Your turn");
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setEngineThinking(false);
          setEngineMessage("Engine unavailable");
          setEngineError(
            error instanceof Error
              ? error.message
              : "Stockfish could not calculate a move.",
          );
        }
      });
    return () => {
      cancelled = true;
      engineRef.current?.cancelCurrent();
    };
  }, [
    computerMode,
    gameStarted,
    engineReady,
    computerGameOver,
    computerTurn,
    fen,
    difficulty,
    movePiece,
  ]);

  useEffect(() => {
    if (!computerMode || !gameStarted || computerGameOver || !gameStartedAt)
      return;
    const timer = window.setInterval(() => {
      setGameDuration(Math.floor((Date.now() - gameStartedAt) / 1000));
      if (timeControl === "Unlimited") return;
      const color = chess.turn();
      setComputerClocks((current) => {
        const index = color === "w" ? 0 : 1;
        if (current[index] <= 1) {
          setComputerResult(
            `${color === playerColor ? "Stockfish wins" : "You win"} on time`,
          );
          return current.map((value, i) => (i === index ? 0 : value)) as [
            number,
            number,
          ];
        }
        return current.map((value, i) => (i === index ? value - 1 : value)) as [
          number,
          number,
        ];
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [
    computerMode,
    gameStarted,
    computerGameOver,
    gameStartedAt,
    timeControl,
    chess,
    playerColor,
  ]);

  useEffect(() => {
    if (!computerMode || !gameStarted) {
      observedPly.current = moves.length;
      return;
    }
    for (let ply = observedPly.current; ply < moves.length; ply++) {
      const move = moves[ply];
      const increment = TIME_CONTROLS[timeControl][1];
      if (increment)
        setComputerClocks(
          (current) =>
            current.map((value, i) =>
              i === (move.color === "w" ? 0 : 1) ? value + increment : value,
            ) as [number, number],
        );
    }
    observedPly.current = moves.length;
  }, [moves, computerMode, gameStarted, timeControl]);

  // Keep the active move visible inside the move list.
  useEffect(() => {
    const box = moveListRef.current;
    const active = box?.querySelector<HTMLElement>('[data-active="true"]');
    if (!box || !active) return;
    const top = active.offsetTop;
    const bottom = top + active.offsetHeight;
    if (top < box.scrollTop) box.scrollTop = Math.max(0, top - 8);
    else if (bottom > box.scrollTop + box.clientHeight)
      box.scrollTop = bottom - box.clientHeight + 8;
  }, [viewIndex, moves.length]);

  // Arrow keys / Home / End step through the game.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA")
      )
        return;
      if (event.key === "ArrowLeft") setViewIndex(Math.max(-1, viewIndex - 1));
      else if (event.key === "ArrowRight")
        setViewIndex(Math.min(moves.length - 1, viewIndex + 1));
      else if (event.key === "ArrowUp" || event.key === "Home")
        setViewIndex(-1);
      else if (event.key === "ArrowDown" || event.key === "End")
        setViewIndex(moves.length - 1);
      else return;
      event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewIndex, moves.length, setViewIndex]);

  const handleReset = () => {
    analysis.cancelAnalysis();
    if (computerMode) {
      setComputerResult("");
      setGameStarted(false);
      setSetupOpen(true);
      setComputerMode(false);
    }
    resetGame();
  };
  // Chess mutates its board object in place. Re-read its squares on each store
  // render so a changed FEN always produces fresh piece coordinates.
  const pieces = getPiecesFromBoard(displayChess);
  const currentReviewMove = result?.moves[activePly] ?? null;
  const pointerDrag = useRef<{
    pointerId: number;
    from: Square;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);
  const [dragPreview, setDragPreview] = useState<{
    from: Square;
    x: number;
    y: number;
  } | null>(null);

  const handlePiecePointerDown = (
    event: React.PointerEvent<HTMLImageElement>,
    from: Square,
    pieceColor: Color,
  ) => {
    if (
      gameOver ||
      isAnalyzing ||
      viewingHistory ||
      !canHumanMove ||
      pieceColor !== displayChess.turn()
    )
      return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerDrag.current = {
      pointerId: event.pointerId,
      from,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
  };

  const handlePiecePointerMove = (
    event: React.PointerEvent<HTMLImageElement>,
  ) => {
    const drag = pointerDrag.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (
      !drag.moved &&
      Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 6
    )
      return;
    drag.moved = true;
    event.preventDefault();
    setDragPreview({ from: drag.from, x: event.clientX, y: event.clientY });
  };

  const handlePiecePointerUp = (
    event: React.PointerEvent<HTMLImageElement>,
  ) => {
    const drag = pointerDrag.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    pointerDrag.current = null;
    setDragPreview(null);

    if (!drag.moved) {
      selectSquare(drag.from);
      return;
    }

    const target = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>("[data-square]")?.dataset.square as
      | Square
      | undefined;
    const legalTarget =
      target &&
      displayChess
        .moves({ square: drag.from, verbose: true })
        .some((move) => move.to === target);
    if (target && legalTarget) {
      if (analysis.isThinking) analysis.cancelAnalysis();
      moveWithPromotion(drag.from, target);
    } else {
      selectSquare(drag.from);
    }
  };

  // Eval logic:
  // - Viewing an OLD move (in the analyzed history) → use its stored eval
  // - Viewing the LATEST move (live game) → use the live eval
  const currentEval = useMemo(() => {
    if (viewingHistory) return result?.moves[activePly]?.evalAfter ?? null;
    return analysis.evalResult ?? liveEval;
  }, [analysis.evalResult, result, activePly, liveEval, viewingHistory]);
  const panelEval = currentEval;
  const whitePovEval = panelEval ? toWhitePov(panelEval, displayFen) : null;
  const bestMoveArrows = useMemo(() => {
    if (viewingHistory) return [];
    const evaluation = analysis.evalResult;
    if (!evaluation) return [];
    const candidates = [
      evaluation.bestMove,
      ...evaluation.lines.map((line) => line.move),
    ];
    const uniqueMoves = Array.from(
      new Set(candidates.filter((move) => move.length >= 4)),
    ).slice(0, 3);
    return uniqueMoves.map((uci) => ({
      from: uci.slice(0, 2) as Square,
      to: uci.slice(2, 4) as Square,
    }));
  }, [analysis.evalResult, viewingHistory]);

  // Game state derivation
  const status = (() => {
    const isCheckmate = displayChess.isCheckmate();
    const isDraw = displayChess.isDraw();
    const gameOver = displayChess.isGameOver();
    const isCheck = displayChess.inCheck();
    const turn = displayChess.turn();
    const loserColor: Color | null = isCheckmate ? turn : null;
    const winnerColor: Color | null = isCheckmate
      ? turn === "w"
        ? "b"
        : "w"
      : null;
    return {
      isCheckmate,
      isDraw,
      gameOver,
      isCheck,
      turn,
      loserColor,
      winnerColor,
    };
  })();

  const {
    isCheckmate,
    isDraw,
    gameOver,
    isCheck,
    turn,
    loserColor,
    winnerColor,
  } = status;
  const isComputerGameOver = computerMode && (!!computerResult || gameOver);
  const computerWinner: Color | null = computerResult.startsWith("You win")
    ? playerColor
    : computerResult.startsWith("Stockfish wins")
      ? playerColor === "w"
        ? "b"
        : "w"
      : null;
  const gameResultHeader = chess.header().Result ?? "*";
  const barWinner =
    computerWinner ??
    winnerColor ??
    (viewIndex === moves.length - 1
      ? gameResultHeader === "1-0"
        ? "w"
        : gameResultHeader === "0-1"
          ? "b"
          : null
      : null);

  const kingRoles = (() => {
    const roles = new Map<Square, KingRole>();
    if (isCheckmate && loserColor && winnerColor) {
      const loserSq = findKingSquare(displayChess, loserColor);
      const winnerSq = findKingSquare(displayChess, winnerColor);
      if (loserSq) roles.set(loserSq, "loser");
      if (winnerSq) roles.set(winnerSq, "winner");
    } else if (isCheck) {
      const sq = findKingSquare(displayChess, turn);
      if (sq) roles.set(sq, "check");
    }
    return roles;
  })();

  const statusText = computerResult
    ? computerResult
    : gameOver
      ? isCheckmate
        ? `Checkmate – ${winnerColor === "w" ? "White" : "Black"} wins`
        : isDraw
          ? `Draw – ${getDrawReason(displayChess)}`
          : "Game over"
      : `${turn === "w" ? "White" : "Black"} to move${isCheck ? " – Check!" : ""}`;

  /* ── Player / clock helpers ── */
  const topColor: Color = isFlipped ? "w" : "b";
  const bottomColor: Color = isFlipped ? "b" : "w";
  const header = chess.header();
  const playerInfo = (color: Color) => {
    if (computerMode) {
      return color === computerColor
        ? {
            name: "Stockfish",
            rating: DIFFICULTY_RANGE[difficulty],
            engine: true,
          }
        : { name: "You", rating: "Unrated", engine: false };
    }
    const name = color === "w" ? header.White : header.Black;
    const elo = color === "w" ? header.WhiteElo : header.BlackElo;
    return {
      name: name && name !== "?" ? name : color === "w" ? "White" : "Black",
      rating: elo && elo !== "?" ? elo : "Unrated",
      engine: false,
    };
  };
  const clockFor = (color: Color) =>
    computerMode && gameStarted
      ? timeControl === "Unlimited"
        ? "∞"
        : clockText(computerClocks[color === "w" ? 0 : 1])
      : "--:--";
  const clockIsLow = (color: Color) =>
    computerMode &&
    gameStarted &&
    timeControl !== "Unlimited" &&
    computerClocks[color === "w" ? 0 : 1] <= 10;
  const toMoveFor = (color: Color) =>
    turn === color && !gameOver && !isComputerGameOver;
  const advantageFor = (color: Color) =>
    Math.max(color === "w" ? materialDifference : -materialDifference, 0);
  const renderPlayer = (color: Color) => {
    const info = playerInfo(color);
    return (
      <PlayerRow
        key={color}
        color={color}
        name={info.name}
        rating={info.rating}
        engine={info.engine}
        captured={capturedBy[color]}
        advantage={advantageFor(color)}
        winner={barWinner === color}
      />
    );
  };

  const whiteInfo = playerInfo("w");
  const blackInfo = playerInfo("b");
  const recognizedOpening = openingBookReady
    ? getOpeningForMoves(moves.slice(0, viewIndex + 1).map((move) => move.san))
    : null;
  const openingLabel = recognizedOpening
    ? `${recognizedOpening.eco}: ${recognizedOpening.name}`
    : [header.ECO, header.Opening].filter(Boolean).join(": ") || "Game moves";
  const canResign = computerMode && gameStarted && !computerGameOver;
  const canOfferDraw = canResign && !engineThinking;

  const renderMoveCell = (ply: number) => {
    const active = ply === viewIndex;
    const classification = result?.moves[ply]?.classification as
      | MoveClass
      | undefined;
    return (
      <button
        type="button"
        data-active={active}
        onClick={() => setViewIndex(ply)}
        className={`flex h-10 items-center gap-2 rounded-md px-3 text-left text-[17px] font-semibold transition-colors ${
          active ? "bg-white/20 text-white" : "text-stone-200 hover:bg-white/10"
        }`}
      >
        <span>{moves[ply].san}</span>
        {classification && <MoveBadge kind={classification} size="list" />}
      </button>
    );
  };

  const setupPanel = (
    <section
      className={`${PANEL} flex min-h-[520px] flex-1 flex-col gap-5 overflow-y-auto p-5 lg:min-h-0`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-white">
            Play vs Computer
          </h2>
          <p className="mt-1 text-[15px] text-stone-400">
            Set up a game on this board.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSetupOpen(false)}
          className={SECONDARY_BTN}
        >
          Close
        </button>
      </div>
      <div>
        <h3 className="mb-2 text-sm font-bold text-stone-400">Your color</h3>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["w", "White"],
              ["b", "Black"],
              ["random", "Random"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setColorChoice(value)}
              className={optionClass(colorChoice === value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <h3 className="mb-2 text-sm font-bold text-stone-400">Difficulty</h3>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(ENGINE_STRENGTH) as Difficulty[]).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setDifficulty(level)}
              className={`${optionClass(difficulty === level)} text-left`}
            >
              <span className="block text-base font-bold">{level}</span>
              <span className="text-xs font-medium text-stone-400">
                {DIFFICULTY_RANGE[level]} Elo
              </span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-stone-500">
          Engine profile: skill {ENGINE_STRENGTH[difficulty].skill}/20, depth{" "}
          {ENGINE_STRENGTH[difficulty].depth}
        </p>
      </div>
      <div>
        <h3 className="mb-2 text-sm font-bold text-stone-400">Time control</h3>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(TIME_CONTROLS) as TimeControl[]).map((control) => (
            <button
              key={control}
              type="button"
              onClick={() => setTimeControl(control)}
              className={optionClass(timeControl === control)}
            >
              {control}
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs leading-relaxed text-stone-500">
        Stockfish runs in a worker. Lower levels use lower skill and shallower
        searches; strength is an estimate.
      </p>
      <button
        type="button"
        onClick={startComputerGame}
        className={`${PRIMARY_BTN} mt-auto`}
      >
        <Play size={20} /> Start game
      </button>
    </section>
  );

  return (
    <div className="relative isolate flex h-[100dvh] w-full flex-col overflow-hidden bg-[#1c1c1c] text-stone-100 [--board-size:min(calc(100vw_-_2rem),70dvh)] lg:flex-row lg:[--board-size:min(calc(100dvh_-_2rem),calc(100vw_-_56px_-_340px_-_320px_-_7rem))]">
      {/* ── Left icon rail ── */}
      <nav
        aria-label="Primary"
        className="z-20 flex h-14 shrink-0 items-center gap-1 bg-[#141414] px-2 lg:h-full lg:w-14 lg:flex-col lg:px-0 lg:py-3"
      >
        <img
          src="/chess.svg"
          alt="ChessLab"
          className="h-9 w-9 shrink-0 rounded-md object-cover lg:mb-3"
        />
        <RailButton
          label={computerMode ? "Exit computer game" : "Play vs Computer"}
          active={computerMode || setupOpen}
          onClick={() => {
            if (computerMode) exitComputerGame();
            else setSetupOpen((open) => !open);
          }}
        >
          <Swords size={22} />
        </RailButton>
        <RailButton
          label="Analyze game"
          disabled={analysis.busy || moves.length === 0}
          onClick={() => void analysis.analyzeGame()}
        >
          <Activity size={22} />
        </RailButton>
        <RailButton
          label="Import PGN"
          active={pgnOpen}
          onClick={() => setPgnOpen((open) => !open)}
        >
          <FileDown size={22} />
        </RailButton>
        <PgnExportButton disabled={moves.length === 0} moveCount={moves.length} getPgn={buildExportPgn} />
        <div className="flex-1" />
        <RailButton
          label={showEval ? "Hide evaluation bar" : "Show evaluation bar"}
          active={showEval}
          onClick={() => setShowEval((value) => !value)}
        >
          <Gauge size={22} />
        </RailButton>
        <RailButton
          label={muted ? "Unmute sounds" : "Mute sounds"}
          onClick={toggleMute}
        >
          {muted ? <VolumeX size={22} /> : <Volume2 size={22} />}
        </RailButton>
        <RailButton
          label="Flip board"
          active={isFlipped}
          onClick={() => setIsFlipped((flipped) => !flipped)}
        >
          <FlipHorizontal2 size={22} />
        </RailButton>
        <RailButton
          label={computerMode ? "Restart computer game" : "Restart game"}
          onClick={computerMode ? startComputerGame : handleReset}
        >
          <RotateCcw size={22} />
        </RailButton>
      </nav>

      <main className="relative z-10 grid min-h-0 min-w-0 flex-1 grid-cols-1 gap-4 overflow-y-auto p-3 lg:grid-cols-[340px_minmax(0,1fr)_320px] lg:overflow-hidden lg:p-4">
        {/* ── Left column: moves, controls, game info ── */}
        <aside
          id="left-sidebar"
          className="order-3 flex min-h-0 min-w-0 flex-col gap-3 lg:order-1"
        >
          {setupOpen && !gameStarted ? (
            setupPanel
          ) : (
            <>
              <section
                className={`${PANEL} flex h-[360px] min-h-0 flex-col overflow-hidden lg:h-auto lg:flex-1`}
              >
                <header className="flex shrink-0 items-center gap-2 border-b border-white/5 px-4 py-3.5">
                  <Clock size={18} className="shrink-0 text-stone-400" />
                  <h2
                    className="truncate text-[15px] font-bold text-stone-100"
                    title={openingLabel}
                  >
                    {openingLabel}
                  </h2>
                </header>
                <div
                  ref={moveListRef}
                  className="relative min-h-0 flex-1 overflow-y-auto px-2 py-2"
                >
                  {movePairs.length === 0 ? (
                    <p className="px-3 py-6 text-center text-[15px] text-stone-500">
                      Make a move or import a PGN to begin.
                    </p>
                  ) : (
                    movePairs.map((row) => (
                      <div
                        key={row.number}
                        className={`grid grid-cols-[2.75rem_1fr_1fr] items-center rounded-md ${row.number % 2 === 0 ? "bg-white/[0.03]" : ""}`}
                      >
                        <span className="pl-3 text-[15px] font-semibold text-stone-500">
                          {row.number}.
                        </span>
                        {renderMoveCell(row.white)}
                        {row.black !== null ? (
                          renderMoveCell(row.black)
                        ) : (
                          <span />
                        )}
                      </div>
                    ))
                  )}
                </div>
              </section>

              <div
                className={`${PANEL} flex shrink-0 items-center gap-1 px-2 py-1.5`}
              >
                <NavButton
                  label="Previous move"
                  disabled={computerMode ? viewIndex < 0 : moves.length === 0}
                  onClick={() => {
                    if (computerMode) previousMove();
                    else undoMove();
                  }}
                >
                  <Rewind size={26} />
                </NavButton>
                <NavButton
                  label="Offer draw"
                  disabled={!canOfferDraw}
                  onClick={() => void offerDraw()}
                >
                  <span className="text-2xl font-bold leading-none">½</span>
                </NavButton>
                <NavButton
                  label="Resign"
                  disabled={!canResign}
                  onClick={() =>
                    setComputerResult("Stockfish wins by resignation")
                  }
                >
                  <Flag size={24} />
                </NavButton>
                <NavButton
                  label="Forward move"
                  disabled={!viewingHistory}
                  onClick={nextMove}
                >
                  <FastForward size={26} />
                </NavButton>
              </div>

              <section className={`${PANEL} flex h-64 shrink-0 flex-col p-4`}>
                <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                  <h2 className="text-[15px] font-extrabold tracking-wide text-stone-100">
                    {computerMode
                      ? "COMPUTER GAME"
                      : moves.length
                        ? "GAME"
                        : "NEW GAME"}
                  </h2>
                  <p className="mt-1.5 text-[15px] leading-snug text-stone-300">
                    {whiteInfo.name} ({whiteInfo.rating}) vs {blackInfo.name} (
                    {blackInfo.rating}){computerMode ? ` (${timeControl})` : ""}
                  </p>
                  <p
                    role="status"
                    aria-live="polite"
                    className="mt-2.5 text-[15px] font-semibold text-emerald-400"
                  >
                    {statusText}
                  </p>
                  {(recognizedOpening || header.Opening) && (
                    <p
                      className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5 text-sm text-stone-400"
                      title={
                        recognizedOpening?.name ?? header.Opening ?? undefined
                      }
                    >
                      <span className="font-semibold text-stone-300">
                        Opening
                      </span>
                      <span>·</span>
                      <span className="text-stone-200">
                        {recognizedOpening?.name ?? header.Opening}
                      </span>
                      {(recognizedOpening?.eco ?? header.ECO) && (
                        <span className="text-xs text-stone-500">
                          ({recognizedOpening?.eco ?? header.ECO})
                        </span>
                      )}
                    </p>
                  )}
                  {computerMode && (
                    <p className="mt-1 text-sm text-stone-400">
                      {engineThinking
                        ? "Stockfish is thinking…"
                        : engineMessage}{" "}
                      · {moves.length} plies · {clockText(gameDuration)}
                    </p>
                  )}
                  {engineError && (
                    <p
                      role="alert"
                      className="mt-2 rounded-lg bg-red-950/60 p-2.5 text-sm text-red-200"
                    >
                      {engineError}
                    </p>
                  )}
                  {viewingHistory && (
                    <button
                      type="button"
                      onClick={lastMoveInHistory}
                      className="mt-3 text-sm font-semibold text-emerald-400 hover:text-emerald-300"
                    >
                      Back to latest move
                    </button>
                  )}
                </div>
                {computerMode ? (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={startComputerGame}
                      className={SECONDARY_BTN}
                    >
                      Restart
                    </button>
                    <button
                      type="button"
                      onClick={exitComputerGame}
                      className={SECONDARY_BTN}
                    >
                      Exit game
                    </button>
                  </div>
                ) : (
                  <div className="mt-3">
                    <input
                      aria-label="Message"
                      placeholder="Message…"
                      className="w-full border-t border-white/10 bg-transparent px-1 pt-3 text-[15px] text-stone-100 outline-none placeholder:text-stone-500 focus:border-emerald-400/60"
                    />
                  </div>
                )}
              </section>
            </>
          )}
        </aside>

        {/* ── Center: eval bar + board ── */}
        <section className="order-1 flex min-h-0 min-w-0 items-center justify-center lg:order-2">
          <div className="flex min-w-0 items-center justify-center gap-3">
            {showEval && (
              <div className="h-[var(--board-size)] w-6 shrink-0">
                <EvalBar
                  height="var(--board-size)"
                  evalCp={
                    whitePovEval?.scoreType === "cp"
                      ? whitePovEval.scoreValue
                      : null
                  }
                  mate={
                    whitePovEval?.scoreType === "mate"
                      ? whitePovEval.scoreValue
                      : null
                  }
                />
              </div>
            )}

            <div className="aspect-square w-[var(--board-size)] max-w-full overflow-hidden rounded-lg shadow-[0_20px_50px_-15px_rgba(0,0,0,0.7)]">
              <div
                className="relative h-full w-full"
                role="grid"
                aria-label="Chess board"
              >
                {displayRanks.map((rank, r) =>
                  displayFiles.map((file, f) => {
                    const square = `${file}${rank}` as Square;
                    const isLight = (r + f) % 2 === 0;
                    const isSelected =
                      !viewingHistory && selectedSquare === square;
                    const isLegalMove = displayLegalMoves.includes(square);
                    const isCapture =
                      isLegalMove && displayChess.get(square) != null;
                    const isLastMove =
                      displayLastMove?.from === square ||
                      displayLastMove?.to === square;
                    const kingRole = kingRoles.get(square);

                    let bgColor = isLight ? "bg-[#efefef]" : "bg-[#b8b8b8]";
                    if (isLastMove)
                      bgColor = isLight ? "bg-[#cfe3ee]" : "bg-[#9cb6c6]";
                    if (isSelected)
                      bgColor = isLight ? "bg-[#c4e0a6]" : "bg-[#86b86b]";

                    const locked =
                      gameOver ||
                      isComputerGameOver ||
                      isAnalyzing ||
                      viewingHistory ||
                      !canHumanMove;

                    return (
                      <button
                        key={square}
                        type="button"
                        role="gridcell"
                        aria-label={square}
                        data-square={square}
                        disabled={locked}
                        onClick={() => {
                          if (selectedSquare && legalMoves.includes(square)) {
                            if (analysis.isThinking) analysis.cancelAnalysis();
                            moveWithPromotion(selectedSquare, square);
                          } else {
                            selectSquare(square);
                          }
                        }}
                        className={`absolute h-[12.5%] w-[12.5%] ${bgColor} ${locked ? "cursor-default" : "cursor-pointer"} focus-visible:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-emerald-500`}
                        style={{
                          top: `${r * SQUARE_SIZE}%`,
                          left: `${f * SQUARE_SIZE}%`,
                        }}
                      >
                        {f === 0 && (
                          <span
                            className={`absolute left-1 top-0.5 text-xs font-bold leading-none sm:text-sm ${isLight ? "text-[#9a9a9a]" : "text-[#f2f2f2]"}`}
                          >
                            {rank}
                          </span>
                        )}
                        {r === 7 && (
                          <span
                            className={`absolute bottom-0.5 right-1 text-xs font-bold leading-none sm:text-sm ${isLight ? "text-[#9a9a9a]" : "text-[#f2f2f2]"}`}
                          >
                            {file}
                          </span>
                        )}
                        {kingRole && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.4 }}
                            className="pointer-events-none absolute inset-0"
                            style={{ background: KING_HIGHLIGHT[kingRole] }}
                          />
                        )}
                        {isLegalMove && (
                          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                            {isCapture ? (
                              <div className="h-[85%] w-[85%] rounded-full border-[4px] border-black/25" />
                            ) : (
                              <div className="h-[30%] w-[30%] rounded-full bg-black/20" />
                            )}
                          </div>
                        )}
                      </button>
                    );
                  }),
                )}

                <AnimatePresence>
                  {pieces.map((piece) => {
                    const fileIndex = displayFiles.indexOf(
                      piece.square[0] as (typeof FILES)[number],
                    );
                    const rankIndex = displayRanks.indexOf(
                      piece.square[1] as (typeof RANKS)[number],
                    );
                    return (
                      <motion.div
                        key={piece.id}
                        layout
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        transition={{
                          type: "spring",
                          stiffness: 600,
                          damping: 35,
                        }}
                        className="pointer-events-none absolute z-10 h-[12.5%] w-[12.5%]"
                        data-square={piece.square}
                        style={{
                          top: `${rankIndex * SQUARE_SIZE}%`,
                          left: `${fileIndex * SQUARE_SIZE}%`,
                        }}
                      >
                        <img
                          src={pieceSrc(piece.color, piece.type)}
                          alt={`${piece.color === "w" ? "White" : "Black"} ${piece.type}`}
                          className={`pointer-events-auto h-full w-full touch-none select-none p-[4%] ${dragPreview?.from === piece.square ? "opacity-30" : "cursor-grab active:cursor-grabbing"}`}
                          draggable={false}
                          onPointerDown={(event) =>
                            handlePiecePointerDown(
                              event,
                              piece.square,
                              piece.color,
                            )
                          }
                          onPointerMove={handlePiecePointerMove}
                          onPointerUp={handlePiecePointerUp}
                          onPointerCancel={() => {
                            pointerDrag.current = null;
                            setDragPreview(null);
                          }}
                          onClick={() => {
                            if (
                              selectedSquare &&
                              legalMoves.includes(piece.square)
                            ) {
                              if (analysis.isThinking)
                                analysis.cancelAnalysis();
                              moveWithPromotion(selectedSquare, piece.square);
                            }
                          }}
                        />
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {bestMoveArrows.length > 0 && (
                  <svg
                    aria-label="Stockfish recommended move arrows"
                    role="img"
                    className="pointer-events-none absolute inset-0 z-20 h-full w-full overflow-visible"
                    viewBox="0 0 800 800"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      {[
                        { color: "#35d04f", marker: "best" },
                        { color: "#f2ae3d", marker: "candidate" },
                        { color: "#56b8ef", marker: "alternate" },
                      ].map(({ color, marker }) => (
                        <marker
                          key={marker}
                          id={`analysis-arrow-${marker}`}
                          viewBox="0 0 10 10"
                          refX="8"
                          refY="5"
                          markerWidth="4"
                          markerHeight="4"
                          markerUnits="strokeWidth"
                          orient="auto-start-reverse"
                        >
                          <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
                        </marker>
                      ))}
                    </defs>
                    {bestMoveArrows.map((arrow, index) => {
                      const fromFile = displayFiles.indexOf(
                        arrow.from[0] as (typeof FILES)[number],
                      );
                      const fromRank = displayRanks.indexOf(
                        arrow.from[1] as (typeof RANKS)[number],
                      );
                      const toFile = displayFiles.indexOf(
                        arrow.to[0] as (typeof FILES)[number],
                      );
                      const toRank = displayRanks.indexOf(
                        arrow.to[1] as (typeof RANKS)[number],
                      );
                      const x1 = (fromFile + 0.5) * 100;
                      const y1 = (fromRank + 0.5) * 100;
                      const x2 = (toFile + 0.5) * 100;
                      const y2 = (toRank + 0.5) * 100;
                      const colors = ["#35d04f", "#f2ae3d", "#56b8ef"];
                      const markers = ["best", "candidate", "alternate"];
                      const color = colors[index];
                      const label =
                        index === 0 ? "Best move" : `Candidate ${index + 1}`;
                      return (
                        <g key={`${arrow.from}-${arrow.to}`}>
                          <title>{`${label}: ${arrow.from} to ${arrow.to}`}</title>
                          <line
                            x1={x1}
                            y1={y1}
                            x2={x2}
                            y2={y2}
                            stroke="#10190f"
                            strokeWidth={index === 0 ? 15 : 12}
                            strokeLinecap="round"
                            opacity="0.72"
                          />
                          <line
                            x1={x1}
                            y1={y1}
                            x2={x2}
                            y2={y2}
                            stroke={color}
                            strokeWidth={index === 0 ? 9 : 7}
                            strokeLinecap="round"
                            opacity={index === 0 ? 0.96 : 0.78}
                            markerEnd={`url(#analysis-arrow-${markers[index]})`}
                          />
                          <circle
                            cx={x1}
                            cy={y1}
                            r={index === 0 ? 10 : 8}
                            fill={color}
                            stroke="#10190f"
                            strokeWidth="4"
                            opacity={index === 0 ? 0.98 : 0.82}
                          />
                        </g>
                      );
                    })}
                  </svg>
                )}

                {currentReviewMove &&
                  (() => {
                    const fileIndex = displayFiles.indexOf(
                      currentReviewMove.to[0] as (typeof FILES)[number],
                    );
                    const rankIndex = displayRanks.indexOf(
                      currentReviewMove.to[1] as (typeof RANKS)[number],
                    );
                    return (
                      <div
                        role="img"
                        aria-label={`${currentReviewMove.classification} move`}
                        title={currentReviewMove.classification}
                        className="pointer-events-none absolute z-20 flex h-[12.5%] w-[12.5%] items-end justify-end p-0.5"
                        style={{
                          top: `${rankIndex * SQUARE_SIZE}%`,
                          left: `${fileIndex * SQUARE_SIZE}%`,
                        }}
                      >
                        <MoveBadge
                          kind={currentReviewMove.classification}
                          size="board"
                        />
                      </div>
                    );
                  })()}

                {dragPreview &&
                  (() => {
                    const piece = pieces.find(
                      (item) => item.square === dragPreview.from,
                    );
                    if (!piece) return null;
                    return (
                      <img
                        aria-hidden
                        src={pieceSrc(piece.color, piece.type)}
                        className="pointer-events-none fixed z-50 h-[calc(var(--board-size)/8)] w-[calc(var(--board-size)/8)] -translate-x-1/2 -translate-y-1/2 drop-shadow-xl"
                        style={{ left: dragPreview.x, top: dragPreview.y }}
                        draggable={false}
                      />
                    );
                  })()}

                <AnimatePresence>
                  {isCheckmate &&
                    Array.from(kingRoles.entries()).map(([square, role]) => {
                      if (role === "check") return null;
                      const fileIndex = displayFiles.indexOf(
                        square[0] as (typeof FILES)[number],
                      );
                      const rankIndex = displayRanks.indexOf(
                        square[1] as (typeof RANKS)[number],
                      );
                      const isLoser = role === "loser";
                      const placeBelow = rankIndex === 0;
                      return (
                        <motion.div
                          key={`label-${square}`}
                          initial={{
                            opacity: 0,
                            y: placeBelow ? -6 : 6,
                            scale: 0.8,
                          }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{
                            type: "spring",
                            stiffness: 400,
                            damping: 22,
                            delay: 0.25,
                          }}
                          className="pointer-events-none absolute z-30 flex h-[12.5%] w-[12.5%] justify-center"
                          style={{
                            top: `${rankIndex * SQUARE_SIZE}%`,
                            left: `${fileIndex * SQUARE_SIZE}%`,
                          }}
                        >
                          <span
                            className={`absolute whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-extrabold tracking-wide text-white shadow-lg ring-2 ring-white/80 sm:text-sm ${isLoser ? "bg-red-600" : "bg-blue-600"} ${placeBelow ? "top-full mt-1" : "bottom-full mb-1"}`}
                          >
                            {isLoser ? "Checkmate" : "Winner"}
                          </span>
                        </motion.div>
                      );
                    })}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </section>

        {/* ── Right column: clocks, players, analysis ── */}
        <aside
          id="analysis-panel"
          className="order-2 flex min-h-0 min-w-0 flex-col gap-3 lg:order-3"
        >
          <div className="hidden h-10 shrink-0 items-center justify-end gap-3 lg:flex">
            <button
              type="button"
              aria-label="Notifications"
              className="grid h-9 w-9 place-items-center rounded-lg text-stone-500 transition-colors hover:bg-white/5 hover:text-stone-200"
            >
              <Bell size={22} />
            </button>
            <div
              aria-hidden
              className="grid h-9 w-9 place-items-center rounded-full bg-[#3b3b3b] text-stone-300"
            >
              <User size={18} />
            </div>
          </div>

          <ClockBox
            text={clockFor(topColor)}
            running={toMoveFor(topColor)}
            low={clockIsLow(topColor)}
          />
          <div className="shrink-0 divide-y divide-emerald-500/40 px-1">
            {renderPlayer(topColor)}
            {renderPlayer(bottomColor)}
          </div>
          <ClockBox
            text={clockFor(bottomColor)}
            running={toMoveFor(bottomColor)}
            low={clockIsLow(bottomColor)}
          />

          <AnalysisPanel
            className="h-[600px] shrink-0 lg:h-auto lg:min-h-0 lg:flex-1"
            analysis={analysis}
            activePly={activePly}
            resultHeader={chess.header().Result ?? "*"}
            currentFen={displayFen}
            evaluation={panelEval}
            onAnalyzeGame={() => {
              void analysis.analyzeGame();
            }}
          />
        </aside>
      </main>

      {/* ── Computer game result ── */}
      {computerMode && isComputerGameOver && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/70 p-4">
          <section className="w-full max-w-md rounded-2xl bg-[#2a2a2a] p-8 text-center shadow-2xl">
            <h2 className="text-4xl font-extrabold text-white">
              {computerResult.includes("Draw") || isDraw
                ? "Draw"
                : computerResult.startsWith("Stockfish wins") ||
                    winnerColor === computerColor
                  ? "Defeat"
                  : "Victory"}
            </h2>
            <p className="mt-3 text-base text-stone-300">
              {computerResult || statusText}
            </p>
            <p className="mt-1 text-sm text-stone-500">
              {Math.ceil(moves.length / 2)} moves · {clockText(gameDuration)}
            </p>
            <div className="mt-7 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={startComputerGame}
                className="rounded-xl border-b-4 border-emerald-700 bg-emerald-500 px-2 py-3 text-[15px] font-extrabold text-white hover:bg-emerald-400"
              >
                Rematch
              </button>
              <button
                type="button"
                onClick={() => {
                  setComputerMode(false);
                  setGameStarted(false);
                  setComputerResult("");
                  void analysis.analyzeGame();
                }}
                className={SECONDARY_BTN}
              >
                Analyze
              </button>
              <button
                type="button"
                onClick={exitComputerGame}
                className={SECONDARY_BTN}
              >
                Menu
              </button>
            </div>
          </section>
        </div>
      )}

      {/* ── Promotion picker ── */}
      {promotionRequest && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/60">
          <section className="rounded-xl bg-[#2a2a2a] p-4 shadow-2xl">
            <p className="mb-3 text-center text-[15px] font-semibold text-stone-200">
              Choose promotion
            </p>
            <div className="flex gap-2">
              {(["q", "r", "b", "n"] as const).map((piece) => (
                <button
                  key={piece}
                  type="button"
                  aria-label={`Promote to ${piece}`}
                  onClick={() => {
                    movePiece(
                      promotionRequest.from,
                      promotionRequest.to,
                      piece,
                    );
                    setPromotionRequest(null);
                  }}
                  className="rounded-lg bg-white/5 p-2 hover:bg-white/15"
                >
                  <img
                    className="h-16 w-16"
                    src={pieceSrc(chess.turn(), piece)}
                    alt={piece}
                  />
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* ── PGN import modal ── */}
      {pgnOpen && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/60 p-4">
          <section className="w-full max-w-md rounded-xl bg-[#2a2a2a] p-5 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-white">Import PGN</h2>
              <button
                type="button"
                onClick={() => {
                  setPgnOpen(false);
                  setPgnError(null);
                }}
                className={SECONDARY_BTN}
              >
                Close
              </button>
            </div>
            <textarea
              value={pgnInput}
              onChange={(e) => setPgnInput(e.target.value)}
              className="h-40 w-full resize-none rounded-lg bg-black/40 p-3 font-mono text-xs text-white outline-none focus:ring-1 focus:ring-emerald-400"
              placeholder="Paste a PGN game here"
              aria-label="PGN game"
            />
            <button
              type="button"
              onClick={handleLoadPgn}
              className={`${PRIMARY_BTN} mt-3 py-2.5 text-base`}
            >
              Load PGN
            </button>
            {pgnError && (
              <p role="alert" className="mt-2 text-sm text-red-300">
                {pgnError}
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
