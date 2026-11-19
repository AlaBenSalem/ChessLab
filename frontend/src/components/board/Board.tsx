import { useState } from "react";
import { FastForward, Flag, Rewind } from "lucide-react";
import type { Color } from "chess.js";
import { getPiecesFromBoard } from "../../lib/boardUtils";
import { getBoardOrientation } from "../../lib/boardOrientation";
import {
  formatClock,
  getClockDisplay,
  type ClockDisplay,
} from "../../lib/clock";
import {
  getGameOverTitle,
  getPgnResult,
  parseComputerResult,
} from "../../lib/gameResult";
import { buildPgn } from "../../lib/pgnExport";
import { getPlayerInfo, type PlayerInfo } from "../../lib/playerInfo";
import { useGameStore } from "../../store/gameStore";
import { useMute } from "../../hooks/useMute";
import { useGameAnalysis } from "../../hooks/useGameAnalysis";
import { useLiveEval } from "../../hooks/useLiveEval";
import { usePgnIO } from "../../hooks/usePgnIO";
import { useBoardInteraction } from "../../hooks/useBoardInteraction";
import {
  useComputerGame,
  DIFFICULTY_RANGE,
  TIME_CONTROLS,
} from "../../hooks/useComputerGame";
import { useBoardView } from "../../hooks/useBoardView";
import { useOpeningLookup } from "../../hooks/useOpeningLookup";
import { useMoveListAutoScroll } from "../../hooks/useMoveListAutoScroll";
import { useHistoryKeyboardNavigation } from "../../hooks/useHistoryKeyboardNavigation";
import { AnalysisPanel } from "./AnalysisPanel";
import { ChessBoard } from "./canvas/ChessBoard";
import { PromotionPicker } from "./canvas/PromotionPicker";
import { PgnImportModal } from "./modals/PgnImportModal";
import { PgnExportModal } from "./modals/PgnExportModal";
import { GameOverOverlay } from "./modals/GameOverOverlay";
import { PrimaryRail } from "./layout/PrimaryRail";
import { ClockBox } from "./layout/ClockBox";
import { PlayerRow } from "./layout/PlayerRow";
import { MoveList } from "./layout/MoveList";
import { NavigationBar } from "./layout/NavigationBar";
import { GameInfoPanel } from "./layout/GameInfoPanel";
import { SetupPanel } from "./layout/SetupPanel";
import { UserActions } from "./layout/UserActions";
import { EvalBar } from "../EvalBar/EvalBarr";

/*
 * Layout sizes live in CSS variables so the grid columns and the board-size
 * formula can never disagree. The 7rem is the combined padding, gaps and
 * eval-bar width around the board.
 */
const ROOT_CLASSES = [
  "relative isolate flex h-[100dvh] w-full flex-col overflow-hidden bg-[#1c1c1c] text-stone-100",
  "[--rail-w:56px] [--left-col:340px] [--right-col:320px]",
  "[--board-size:min(calc(100vw_-_2rem),70dvh)]",
  "lg:flex-row",
  "lg:[--board-size:min(calc(100dvh_-_2rem),calc(100vw_-_var(--rail-w)_-_var(--left-col)_-_var(--right-col)_-_7rem))]",
].join(" ");

const MAIN_CLASSES =
  "relative z-10 grid min-h-0 min-w-0 flex-1 grid-cols-1 gap-4 overflow-y-auto p-3 " +
  "lg:grid-cols-[var(--left-col)_minmax(0,1fr)_var(--right-col)] lg:overflow-hidden lg:p-4";

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
    isImported,
  } = useGameStore();

  const { muted, toggleMute } = useMute();
  const [isFlipped, setIsFlipped] = useState(false);
  const [showEval, setShowEval] = useState(true);

  const findOpening = useOpeningLookup();
  const moveListRef = useMoveListAutoScroll(viewIndex, moves.length);
  useHistoryKeyboardNavigation({
    viewIndex,
    lastIndex: moves.length - 1,
    setViewIndex,
  });

  const analysis = useGameAnalysis(chess, fen);
  const { isAnalyzing, result } = analysis;

  const computer = useComputerGame({
    chess,
    fen,
    moves,
    resetGame,
    movePiece,
    cancelAnalysis: analysis.cancelAnalysis,
  });
  const {
    colorChoice,
    setColorChoice,
    difficulty,
    setDifficulty,
    timeControl,
    setTimeControl,
    computerMode,
    setupOpen,
    setSetupOpen,
    gameStarted,
    playerColor,
    computerColor,
    engineThinking,
    engineMessage,
    computerResult,
    computerClocks,
    gameDuration,
    engineError,
    computerGameOver,
    canHumanMove,
    startComputerGame,
    exitComputerGame,
    offerDraw,
    resign,
    prepareReset,
    prepareAnalysis,
  } = computer;

  const liveEval = useLiveEval(fen, !analysis.busy);

  // chess.js mutates in place, so read the headers on every render.
  const header = chess.header();
  const resultHeader = header.Result ?? "*";

  const view = useBoardView({
    chess,
    moves,
    viewIndex,
    legalMoves,
    result,
    analysisEval: analysis.evalResult,
    liveEval,
    gameResultHeader: resultHeader,
    computerMode,
    computerResult,
    computerColor,
    playerColor,
  });
  const {
    activePly,
    viewingHistory,
    displayChess,
    displayFen,
    displayLastMove,
    displayLegalMoves,
    capturedBy,
    materialDifference,
    currentEval,
    whitePovEval,
    bestMoveArrows,
    isCheckmate,
    isDraw,
    gameOver,
    turn,
    winnerColor,
    isComputerGameOver,
    statusText,
    kingRoles,
    barWinner,
  } = view;

  /* ── Orientation, players, clocks ── */

  const {
    files: displayFiles,
    ranks: displayRanks,
    topColor,
    bottomColor,
  } = getBoardOrientation(isFlipped);

  const playerContext = {
    headers: header,
    computerMode,
    computerColor,
    engineRating: DIFFICULTY_RANGE[difficulty],
  };
  const players: Record<Color, PlayerInfo> = {
    w: getPlayerInfo("w", playerContext),
    b: getPlayerInfo("b", playerContext),
  };

  const clocksEnabled = computerMode && gameStarted;
  const isUnlimitedTime = timeControl === "Unlimited";
  const clockFor = (seconds: number) =>
    getClockDisplay({
      enabled: clocksEnabled,
      unlimited: isUnlimitedTime,
      seconds,
    });
  const clocks: Record<Color, ClockDisplay> = {
    w: clockFor(computerClocks[0]),
    b: clockFor(computerClocks[1]),
  };

  const isToMove = (color: Color) =>
    turn === color && !gameOver && !isComputerGameOver;
  const advantageFor = (color: Color) =>
    Math.max(color === "w" ? materialDifference : -materialDifference, 0);

  /* ── Opening, result and export ── */

  const recognizedOpening = findOpening(
    moves.slice(0, viewIndex + 1).map((move) => move.san),
  );
  const openingLabel = recognizedOpening
    ? `${recognizedOpening.eco}: ${recognizedOpening.name}`
    : [header.ECO, header.Opening].filter(Boolean).join(": ") || "Game moves";

  const computerOutcome = parseComputerResult(computerResult);

  const buildExportPgn = () =>
    buildPgn({
      chess,
      event: computerMode ? "Play vs Computer" : "Casual Game",
      whiteName: players.w.name,
      blackName: players.b.name,
      result: getPgnResult(chess, computerOutcome, playerColor, computerColor),
      opening: findOpening(moves.map((move) => move.san)),
      timeControl:
        computerMode && !isUnlimitedTime
          ? TIME_CONTROLS[timeControl]
          : undefined,
    });

  const pgnIO = usePgnIO({
    loadPgn,
    cancelAnalysis: analysis.cancelAnalysis,
    buildExportPgn,
  });

  /* ── Actions ── */

  const handleAnalyzeGame = () => {
    void analysis.analyzeGame();
  };

  const handleReset = () => {
    analysis.cancelAnalysis();
    prepareReset();
    resetGame();
  };

  const handleAnalyzeFinishedGame = () => {
    prepareAnalysis();
    handleAnalyzeGame();
  };

  /*
   * Previous is a real Undo only in a live Free Play game. Computer games keep
   * their view-only navigation, and so does Game Review (an analysed game or an
   * imported PGN): undo there would destroy moves with no way to redo them.
   */
  const inGameReview = isImported || Boolean(result) || analysis.busy;
  const previousUndoesMove = !computerMode && !inGameReview;

  const handlePrevious = () => {
    if (!previousUndoesMove) {
      previousMove();
      return;
    }
    // Drop any in-flight analysis of the position we are about to leave.
    analysis.cancelAnalysis();
    undoMove();
  };

  const interaction = useBoardInteraction({
    chess,
    displayChess,
    selectedSquare,
    legalMoves,
    canHumanMove,
    gameOver,
    isAnalyzing,
    isThinking: analysis.isThinking,
    viewingHistory,
    selectSquare,
    movePiece,
    cancelAnalysis: analysis.cancelAnalysis,
  });

  /* ── Derived render values ── */

  // Deliberately recomputed on every render: chess.js mutates its board in
  // place, so memoising on the Chess object would serve stale coordinates.
  const pieces = getPiecesFromBoard(displayChess);
  const currentReviewMove = result?.moves[activePly] ?? null;

  const evalCp =
    whitePovEval?.scoreType === "cp" ? whitePovEval.scoreValue : null;
  const evalMate =
    whitePovEval?.scoreType === "mate" ? whitePovEval.scoreValue : null;

  const canResign = computerMode && gameStarted && !computerGameOver;
  const canOfferDraw = canResign && !engineThinking;

  const renderPlayer = (color: Color) => (
    <PlayerRow
      key={color}
      color={color}
      name={players[color].name}
      rating={players[color].rating}
      engine={players[color].engine}
      captured={capturedBy[color]}
      advantage={advantageFor(color)}
      winner={barWinner === color}
    />
  );

  return (
    <div className={ROOT_CLASSES}>
      {/* ── Left icon rail ── */}
      <PrimaryRail
        computerMode={computerMode}
        setupOpen={setupOpen}
        analysisBusy={analysis.busy}
        hasMoves={moves.length > 0}
        importOpen={pgnIO.importOpen}
        showEval={showEval}
        muted={muted}
        isFlipped={isFlipped}
        onComputer={() =>
          computerMode ? exitComputerGame() : setSetupOpen((open) => !open)
        }
        onAnalyze={handleAnalyzeGame}
        onImport={() => pgnIO.setImportOpen((open) => !open)}
        onExport={pgnIO.openExport}
        onToggleEval={() => setShowEval((value) => !value)}
        onToggleMute={toggleMute}
        onFlip={() => setIsFlipped((flipped) => !flipped)}
        onRestart={computerMode ? startComputerGame : handleReset}
      />

      <main className={MAIN_CLASSES}>
        {/* ── Left column: moves, controls, game info ── */}
        <aside
          id="left-sidebar"
          className="order-3 flex min-h-0 min-w-0 flex-col gap-3 lg:order-1"
        >
          {setupOpen && !gameStarted ? (
            <SetupPanel
              colorChoice={colorChoice}
              difficulty={difficulty}
              timeControl={timeControl}
              onColorChoiceChange={setColorChoice}
              onDifficultyChange={setDifficulty}
              onTimeControlChange={setTimeControl}
              onClose={() => setSetupOpen(false)}
              onStart={startComputerGame}
            />
          ) : (
            <>
              <MoveList
                moves={moves}
                currentIndex={viewIndex}
                openingLabel={openingLabel}
                reviewMoves={result?.moves}
                listRef={moveListRef}
                onSelect={setViewIndex}
              />

              <NavigationBar
                previous={{
                  label: "Previous move",
                  disabled: previousUndoesMove
                    ? moves.length === 0
                    : viewIndex < 0,
                  onClick: handlePrevious,
                  children: <Rewind size={26} />,
                }}
                offerDraw={{
                  label: "Offer draw",
                  disabled: !canOfferDraw,
                  onClick: () => void offerDraw(),
                  children: (
                    <span className="text-2xl font-bold leading-none">½</span>
                  ),
                }}
                resign={{
                  label: "Resign",
                  disabled: !canResign,
                  onClick: resign,
                  children: <Flag size={24} />,
                }}
                forward={{
                  label: "Forward move",
                  disabled: !viewingHistory,
                  onClick: nextMove,
                  children: <FastForward size={26} />,
                }}
              />

              <GameInfoPanel
                computerMode={computerMode}
                hasMoves={moves.length > 0}
                whiteName={players.w.name}
                whiteRating={players.w.rating}
                blackName={players.b.name}
                blackRating={players.b.rating}
                timeControl={timeControl}
                statusText={statusText}
                openingName={
                  recognizedOpening?.name ?? header.Opening ?? undefined
                }
                openingEco={recognizedOpening?.eco ?? header.ECO ?? undefined}
                showOpening={Boolean(recognizedOpening || header.Opening)}
                engineThinking={engineThinking}
                engineMessage={engineMessage}
                plies={moves.length}
                duration={formatClock(gameDuration)}
                engineError={engineError}
                viewingHistory={viewingHistory}
                onBackToLatest={lastMoveInHistory}
                onRestart={startComputerGame}
                onExit={exitComputerGame}
              />
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
                  evalCp={evalCp}
                  mate={evalMate}
                />
              </div>
            )}

            <div className="aspect-square w-[var(--board-size)] max-w-full overflow-hidden rounded-lg shadow-[0_20px_50px_-15px_rgba(0,0,0,0.7)]">
              <ChessBoard
                chess={displayChess}
                displayFiles={displayFiles}
                displayRanks={displayRanks}
                pieces={pieces}
                selectedSquare={selectedSquare}
                legalMoves={displayLegalMoves}
                lastMove={displayLastMove}
                kingRoles={kingRoles}
                gameOver={gameOver}
                computerGameOver={isComputerGameOver}
                isAnalyzing={isAnalyzing}
                viewingHistory={viewingHistory}
                canHumanMove={canHumanMove}
                currentReviewMove={currentReviewMove}
                arrows={bestMoveArrows}
                dragPreview={interaction.dragPreview}
                isCheckmate={isCheckmate}
                onSquareClick={interaction.onSquareClick}
                onPieceClick={interaction.onPieceClick}
                onPointerDown={interaction.handlePointerDown}
                onPointerMove={interaction.handlePointerMove}
                onPointerUp={interaction.handlePointerUp}
                onPointerCancel={interaction.cancelPointer}
              />
            </div>
          </div>
        </section>

        {/* ── Right column: clocks, players, analysis ── */}
        <aside
          id="analysis-panel"
          className="order-2 flex min-h-0 min-w-0 flex-col gap-3 lg:order-3"
        >
          <UserActions />

          <ClockBox
            text={clocks[topColor].text}
            running={isToMove(topColor)}
            low={clocks[topColor].low}
          />
          <div className="shrink-0 divide-y divide-emerald-500/40 px-1">
            {renderPlayer(topColor)}
            {renderPlayer(bottomColor)}
          </div>
          <ClockBox
            text={clocks[bottomColor].text}
            running={isToMove(bottomColor)}
            low={clocks[bottomColor].low}
          />

          <AnalysisPanel
            className="h-[600px] shrink-0 lg:h-auto lg:min-h-0 lg:flex-1"
            analysis={analysis}
            activePly={activePly}
            resultHeader={resultHeader}
            currentFen={displayFen}
            evaluation={currentEval}
            onAnalyzeGame={handleAnalyzeGame}
          />
        </aside>
      </main>

      {/* ── Overlays and modals ── */}
      <GameOverOverlay
        open={computerMode && isComputerGameOver}
        title={getGameOverTitle({
          outcome: computerOutcome,
          isDraw,
          winnerColor,
          computerColor,
        })}
        result={computerResult || statusText}
        moveCount={Math.ceil(moves.length / 2)}
        duration={formatClock(gameDuration)}
        onRematch={startComputerGame}
        onAnalyze={handleAnalyzeFinishedGame}
        onMenu={exitComputerGame}
      />

      <PromotionPicker
        request={interaction.promotionRequest}
        turn={chess.turn()}
        onPromote={interaction.promote}
        onCancel={() => interaction.setPromotionRequest(null)}
      />

      <PgnImportModal
        open={pgnIO.importOpen}
        value={pgnIO.importText}
        error={pgnIO.importError}
        onChange={pgnIO.setImportText}
        onClose={pgnIO.closeImport}
        onSubmit={pgnIO.submitImport}
      />
      <PgnExportModal
        open={pgnIO.exportOpen}
        moveCount={moves.length}
        value={pgnIO.exportText}
        message={pgnIO.exportMessage}
        onClose={pgnIO.closeExport}
        onCopy={pgnIO.copyExport}
        onDownload={pgnIO.downloadExport}
      />
    </div>
  );
}
