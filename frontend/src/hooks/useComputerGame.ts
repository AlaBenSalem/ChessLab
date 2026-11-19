import { useEffect, useRef, useState } from "react";
import type { Chess } from "chess.js";
import type { Color, Square } from "chess.js";
import { StockfishEngine } from "../engine/StockfishEngine";
import type { HistoryMove } from "../store/gameStore";

export type Difficulty = "Beginner" | "Easy" | "Medium" | "Hard" | "Expert" | "Master";
export type TimeControl = "Unlimited" | "1+0" | "3+0" | "5+0" | "10+0" | "15+10";
export type ColorChoice = "w" | "b" | "random";

export const ENGINE_STRENGTH: Record<Difficulty, { elo: number; skill: number; depth: number }> = {
  Beginner: { elo: 1320, skill: 0, depth: 3 }, Easy: { elo: 1320, skill: 2, depth: 5 },
  Medium: { elo: 1400, skill: 6, depth: 8 }, Hard: { elo: 1800, skill: 11, depth: 10 },
  Expert: { elo: 2200, skill: 16, depth: 12 }, Master: { elo: 2800, skill: 20, depth: 16 },
};

export const DIFFICULTY_RANGE: Record<Difficulty, string> = {
  Beginner: "400\u2013800", Easy: "800\u20131000", Medium: "1000\u20131400",
  Hard: "1400\u20131800", Expert: "1800\u20132200", Master: "2200+",
};

export const TIME_CONTROLS: Record<TimeControl, [number, number]> = {
  Unlimited: [0, 0], "1+0": [60, 0], "3+0": [180, 0],
  "5+0": [300, 0], "10+0": [600, 0], "15+10": [900, 10],
};

interface Options {
  chess: Chess;
  fen: string;
  moves: HistoryMove[];
  resetGame: () => void;
  movePiece: (from: Square, to: Square, promotion?: "q" | "r" | "b" | "n") => boolean;
  cancelAnalysis: () => void;
}

export function useComputerGame({ chess, fen, moves, resetGame, movePiece, cancelAnalysis }: Options) {
  const [colorChoice, setColorChoice] = useState<ColorChoice>("w");
  const [difficulty, setDifficulty] = useState<Difficulty>("Medium");
  const [timeControl, setTimeControl] = useState<TimeControl>("10+0");
  const [computerMode, setComputerMode] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [playerColor, setPlayerColor] = useState<Color>("w");
  const [engineReady, setEngineReady] = useState(false);
  const [engineSession, setEngineSession] = useState(0);
  const [engineThinking, setEngineThinking] = useState(false);
  const [engineMessage, setEngineMessage] = useState("Ready");
  const [computerResult, setComputerResult] = useState("");
  const [computerClocks, setComputerClocks] = useState<[number, number]>([600, 600]);
  const [gameStartedAt, setGameStartedAt] = useState<number | null>(null);
  const [gameDuration, setGameDuration] = useState(0);
  const [engineError, setEngineError] = useState("");
  const engineRef = useRef<StockfishEngine | null>(null);
  const observedPly = useRef(0);

  const computerColor: Color = playerColor === "w" ? "b" : "w";
  const computerGameOver = Boolean(computerResult) || chess.isGameOver();
  const computerTurn = computerMode && gameStarted && chess.turn() !== playerColor;
  const canHumanMove = !computerMode || (gameStarted && !computerGameOver && !engineThinking && chess.turn() === playerColor);

  const startComputerGame = () => {
    cancelAnalysis();
    const side: Color = colorChoice === "random" ? (Math.random() < 0.5 ? "w" : "b") : colorChoice;
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

  const prepareReset = () => {
    if (!computerMode) return;
    setComputerResult("");
    setGameStarted(false);
    setSetupOpen(true);
    setComputerMode(false);
  };

  const prepareAnalysis = () => {
    setComputerMode(false);
    setGameStarted(false);
    setComputerResult("");
  };

  const resign = () => setComputerResult("Stockfish wins by resignation");

  const offerDraw = async () => {
    const engine = engineRef.current;
    if (!engine || engineThinking || computerGameOver || chess.turn() !== playerColor) return;
    setEngineThinking(true);
    setEngineMessage("Considering draw offer…");
    try {
      const strength = ENGINE_STRENGTH[difficulty];
      const answer = await engine.evaluate(fen, strength.depth, { elo: strength.elo, skillLevel: strength.skill });
      if (answer.scoreType === "mate" ? answer.scoreValue >= 0 : answer.scoreValue >= -60) setComputerResult("Draw by agreement");
      else setEngineMessage("Stockfish declined the draw");
    } catch {
      setEngineError("Could not evaluate the draw offer.");
    } finally {
      setEngineThinking(false);
    }
  };

  useEffect(() => {
    if (!computerMode || !gameStarted) return;
    const engine = new StockfishEngine();
    engineRef.current = engine;
    void engine.init().then(() => {
      setEngineReady(true);
      setEngineMessage("Stockfish ready");
    }).catch(() => {
      setEngineError("Stockfish failed to load. Exit the computer game or restart it.");
      setEngineMessage("Engine unavailable");
    });
    return () => {
      engineRef.current = null;
      void engine.dispose();
    };
  }, [computerMode, gameStarted, engineSession]);

  useEffect(() => {
    if (!computerMode || !gameStarted || !engineReady || computerGameOver || !computerTurn || !engineRef.current) return;
    let cancelled = false;
    setEngineThinking(true);
    setEngineMessage("Stockfish is thinking…");
    const strength = ENGINE_STRENGTH[difficulty];
    void engineRef.current.evaluate(fen, strength.depth, { elo: strength.elo, skillLevel: strength.skill }).then((answer) => {
      if (cancelled) return;
      const uci = answer.bestMove;
      if (!uci || uci === "(none)") {
        setEngineError("Stockfish did not return a move.");
        return;
      }
      const promotion = (uci[4] as "q" | "r" | "b" | "n" | undefined) ?? "q";
      if (!movePiece(uci.slice(0, 2) as Square, uci.slice(2, 4) as Square, promotion)) setEngineError("Stockfish returned an illegal move. Restart the computer game.");
      setEngineThinking(false);
      setEngineMessage("Your turn");
    }).catch((error: unknown) => {
      if (!cancelled) {
        setEngineThinking(false);
        setEngineMessage("Engine unavailable");
        setEngineError(error instanceof Error ? error.message : "Stockfish could not calculate a move.");
      }
    });
    return () => {
      cancelled = true;
      engineRef.current?.cancelCurrent();
    };
  }, [computerMode, gameStarted, engineReady, computerGameOver, computerTurn, fen, difficulty, movePiece]);

  useEffect(() => {
    if (!computerMode || !gameStarted || computerGameOver || !gameStartedAt) return;
    const timer = window.setInterval(() => {
      setGameDuration(Math.floor((Date.now() - gameStartedAt) / 1000));
      if (timeControl === "Unlimited") return;
      const color = chess.turn();
      setComputerClocks((current) => {
        const index = color === "w" ? 0 : 1;
        if (current[index] <= 1) {
          setComputerResult(`${color === playerColor ? "Stockfish wins" : "You win"} on time`);
          return current.map((value, i) => i === index ? 0 : value) as [number, number];
        }
        return current.map((value, i) => i === index ? value - 1 : value) as [number, number];
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [computerMode, gameStarted, computerGameOver, gameStartedAt, timeControl, chess, playerColor]);

  useEffect(() => {
    if (!computerMode || !gameStarted) {
      observedPly.current = moves.length;
      return;
    }
    for (let ply = observedPly.current; ply < moves.length; ply++) {
      const increment = TIME_CONTROLS[timeControl][1];
      if (increment) setComputerClocks((current) => current.map((value, i) => i === (moves[ply].color === "w" ? 0 : 1) ? value + increment : value) as [number, number]);
    }
    observedPly.current = moves.length;
  }, [moves, computerMode, gameStarted, timeControl]);

  return {
    colorChoice, setColorChoice, difficulty, setDifficulty, timeControl, setTimeControl,
    computerMode, setComputerMode, setupOpen, setSetupOpen, gameStarted, playerColor,
    computerColor, engineThinking, engineMessage, computerResult, computerClocks, gameDuration,
    engineError, computerGameOver, computerTurn, canHumanMove, startComputerGame,
    exitComputerGame, offerDraw, prepareReset, prepareAnalysis, resign,
  };
}
