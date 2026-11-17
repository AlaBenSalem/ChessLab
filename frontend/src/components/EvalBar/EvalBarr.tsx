import { useEffect } from "react";
import {
  motion,
  useReducedMotion,
  useSpring,
  useTransform,
  useVelocity,
} from "framer-motion";
import type { MotionValue } from "framer-motion";

interface Props {
  evalCp: number | null; // centipawns from White's perspective
  mate: number | null;
  height?: string;
}

/* ── Look & feel knobs ─────────────────────────────────────── */
const BAR_W = 24; // px, outer width of the bar
const WATER = "#d1d5db"; // gray-300 — change this to recolor the water
const SLOSH = { stiffness: 70, damping: 9 }; // water level spring (lower damping = more bounce)
const TILT_GAIN = 0.25; // degrees of surface tilt per (% / second) of level speed
const MAX_TILT = 14; // degrees

/* ── Wave geometry ─────────────────────────────────────────── */
const INNER = BAR_W - 2; // inside the 1px border
const L = BAR_W; // wavelength
const PERIODS = 3; // svg is 3 wavelengths wide; we slide it by exactly one → seamless loop
const SKIRT = 14; // solid fill below the crest so tilting never exposes a gap

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

/** One repeating sine ripple. `a` is the peak-to-peak height in px. */
function wavePath(a: number) {
  const w = L * PERIODS;
  const h = 2 * a + SKIRT;
  let d = `M0 ${a} Q${L / 4} 0 ${L / 2} ${a}`;
  for (let x = L; x <= w; x += L / 2) d += ` T${x} ${a}`;
  d += ` V${h} H0 Z`;
  return { d, w, h };
}

function WaveLayer({
  amplitude,
  fillOpacity,
  seconds,
  reverse = false,
  scaleY,
  still,
}: {
  amplitude: number;
  fillOpacity: number;
  seconds: number;
  reverse?: boolean;
  scaleY: MotionValue<number>;
  still: boolean;
}) {
  const { d, w, h } = wavePath(amplitude);
  return (
    <motion.svg
      aria-hidden
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="absolute left-0"
      // Baseline of the wave sits exactly on the water level; scaleY pivots on it
      style={{
        bottom: -(amplitude + SKIRT),
        scaleY,
        originX: 0,
        originY: amplitude / h,
      }}
      initial={false}
      animate={still ? { x: -L / 2 } : { x: reverse ? [-L, 0] : [0, -L] }}
      transition={
        still
          ? { duration: 0 }
          : { duration: seconds, ease: "linear", repeat: Infinity }
      }
    >
      <path d={d} fill={WATER} fillOpacity={fillOpacity} />
    </motion.svg>
  );
}

export function EvalBar({ evalCp, mate, height = "480px" }: Props) {
  const reduce = useReducedMotion() ?? false;

  // Map pawns of advantage to bar fill. This is a visual scale, not a win
  // probability; cap normal evaluations so both colors remain visible.
  const pawns = (evalCp ?? 0) / 100;
  const whitePct =
    mate !== null
      ? mate > 0 || (mate === 0 && !Object.is(mate, -0))
        ? 98
        : 2
      : Math.max(2, Math.min(98, 100 / (1 + Math.exp(-0.7 * pawns))));

  // Format label
  let label = evalCp === null && mate === null ? "…" : "0.0";
  if (mate !== null) {
    label = mate === 0
      ? Object.is(mate, -0) ? "0-1" : "1-0"
      : `${mate > 0 ? "+" : "−"}M${Math.abs(mate)}`;
  } else if (evalCp !== null) {
    label = (evalCp / 100).toFixed(1);
    if (evalCp > 0) label = `+${label}`;
  }

  /* 1. Water level — an under-damped spring, so it overshoots and rocks back */
  const level = useSpring(
    whitePct,
    reduce ? { stiffness: 300, damping: 40 } : SLOSH,
  );
  useEffect(() => {
    level.set(whitePct);
  }, [whitePct, level]);
  const y = useTransform(level, (l) => `${100 - l}%`);

  /* 2. The faster the level moves, the more the surface tilts and the
        taller the ripples get. A second spring keeps it rocking for a
        moment after the level has stopped, like real water. */
  const velocity = useVelocity(level);
  const tiltTarget = useTransform(velocity, (v) =>
    clamp(-v * TILT_GAIN, -MAX_TILT, MAX_TILT),
  );
  const tilt = useSpring(tiltTarget, { stiffness: 140, damping: 7 });
  const energyTarget = useTransform(
    velocity,
    (v) => 1 + clamp(Math.abs(v) / 40, 0, 1.4),
  );
  const energy = useSpring(energyTarget, { stiffness: 120, damping: 14 });

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-mono text-gray-300">{label}</span>
      <div
        className="relative overflow-hidden rounded border border-gray-700 bg-gray-800"
        style={{ width: BAR_W, height }}
        role="meter"
        aria-label={`Evaluation bar, White share: ${label}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(whitePct)}
      >
        {/* Water body: its top edge is the water level */}
        <motion.div
          className="absolute inset-0"
          style={{ y, backgroundColor: WATER }}
        >
          {/* Extra water hanging below the body. When the spring overshoots past
              100%, the body slides up; this keeps the bottom of the bar covered
              instead of exposing a dark gap. */}
          <div
            aria-hidden
            className="absolute inset-x-0 top-full h-full"
            style={{ backgroundColor: WATER }}
          />
          {/* Pivot sits on the water line and tilts the surface */}
          <motion.div
            className="absolute top-0"
            style={{
              left: -(L * PERIODS - INNER) / 2,
              width: L * PERIODS,
              height: 0,
              rotate: reduce ? 0 : tilt,
            }}
          >
            {/* back ripple: taller, fainter, drifts the other way */}
            <WaveLayer
              amplitude={8}
              fillOpacity={0.4}
              seconds={3.6}
              reverse
              scaleY={energy}
              still={reduce}
            />
            {/* front ripple: solid */}
            <WaveLayer
              amplitude={6}
              fillOpacity={1}
              seconds={2.4}
              scaleY={energy}
              still={reduce}
            />
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
