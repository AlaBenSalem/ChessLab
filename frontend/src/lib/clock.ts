const LOW_TIME_THRESHOLD_SECONDS = 10;
const NO_CLOCK_TEXT = "--:--";
const UNLIMITED_CLOCK_TEXT = "∞";

const pad = (value: number) => value.toString().padStart(2, "0");

/** Formats a number of seconds as `MM:SS`. Negative or non-finite input renders as `00:00`. */
export function formatClock(totalSeconds: number): string {
  const seconds = Number.isFinite(totalSeconds) ? Math.max(0, Math.floor(totalSeconds)) : 0;
  return `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`;
}

export interface ClockDisplay {
  text: string;
  /** True when a running clock is about to expire. */
  low: boolean;
}

interface ClockDisplayInput {
  /** Clocks only exist during a started computer game. */
  enabled: boolean;
  unlimited: boolean;
  seconds: number;
}

export function getClockDisplay({ enabled, unlimited, seconds }: ClockDisplayInput): ClockDisplay {
  if (!enabled) return { text: NO_CLOCK_TEXT, low: false };
  if (unlimited) return { text: UNLIMITED_CLOCK_TEXT, low: false };
  return { text: formatClock(seconds), low: seconds <= LOW_TIME_THRESHOLD_SECONDS };
}
