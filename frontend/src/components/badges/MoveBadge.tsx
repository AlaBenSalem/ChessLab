import type { CSSProperties } from "react";
import type { MoveClass, MoveClassIcon } from "../../lib/moveClasses";
import { MOVE_CLASSES } from "../../lib/moveClasses";

type BadgeSize = "card" | "list" | "board";

interface Props {
  kind: MoveClass;
  size?: BadgeSize;
  className?: string;
}

const SIZE: Record<BadgeSize, number> = {
  card: 52,
  list: 26,
  board: 29,
};

/** Round to 2 decimals so generated path data stays short and clean. */
const n = (v: number) => Number(v.toFixed(2));

/* -------------------------------------------------------------------------- */
/*  Glyph building blocks                                                     */
/*  Everything is drawn as vector shapes on a 24 x 24 grid (no fonts), so the */
/*  marks look identical on every OS and stay razor sharp at any size.        */
/* -------------------------------------------------------------------------- */

interface BangProps {
  x: number; // horizontal centre
  top: number; // top edge of the whole mark
  height: number; // top of stem -> bottom of dot
  width: number; // width of the stem at its widest point
}

/** Bold exclamation mark: tapered rounded stem + round dot. */
function Bang({ x, top, height, width }: BangProps) {
  const rTop = width / 2;
  const rBottom = width * 0.3;
  const dotR = width * 0.47;
  const stemEnd = top + height * 0.63;
  const dotY = top + height - dotR;

  const stem = [
    `M${n(x - rTop)} ${n(top + rTop)}`,
    `A${n(rTop)} ${n(rTop)} 0 0 1 ${n(x + rTop)} ${n(top + rTop)}`,
    `L${n(x + rBottom)} ${n(stemEnd - rBottom)}`,
    `A${n(rBottom)} ${n(rBottom)} 0 0 1 ${n(x - rBottom)} ${n(stemEnd - rBottom)}`,
    "Z",
  ].join(" ");

  return (
    <>
      <path d={stem} />
      <circle cx={n(x)} cy={n(dotY)} r={n(dotR)} />
    </>
  );
}

interface QueryProps {
  x: number; // horizontal centre
  top: number; // top edge of the whole mark
  scale: number; // 1 = 18.4 units tall
}

/** Bold question mark: one smooth stroked hook + round dot. */
function Query({ x, top, scale }: QueryProps) {
  return (
    <g transform={`translate(${n(x)} ${n(top)}) scale(${n(scale)})`}>
      <path
        d="M-4 5.7 C-4 3.2 -2.3 1.7 0 1.7 C2.3 1.7 4 3.2 4 5.4 C4 7.6 2.7 8.5 1.5 9.4 C0.5 10.1 0 10.6 0 11.7"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="0" cy="16.5" r="2" />
    </g>
  );
}

/** Five-point star with a slightly chubby, softly rounded silhouette. */
const STAR_PATH = (() => {
  const outer = 9;
  const inner = 4.4;
  const cx = 12;
  const cy = 12 + (outer - outer * Math.cos(Math.PI / 5)) / 2; // optical centring
  const points = Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 === 0 ? outer : inner;
    const a = ((-90 + i * 36) * Math.PI) / 180;
    return `${n(cx + r * Math.cos(a))} ${n(cy + r * Math.sin(a))}`;
  });
  return `M${points.join("L")}Z`;
})();

function Glyph({ icon }: { icon: MoveClassIcon }) {
  switch (icon) {
    // !!  – two big, bold, clearly separated exclamation marks
    case "brilliant":
      return (
        <>
          <Bang x={6.9} top={2.3} height={19.4} width={6.3} />
          <Bang x={17.1} top={2.3} height={19.4} width={6.3} />
        </>
      );

    // !
    case "great":
      return <Bang x={12} top={2.6} height={18.8} width={6.4} />;

    // ?!
    case "inaccuracy":
      return (
        <>
          <Query x={7.6} top={3.3} scale={0.92} />
          <Bang x={18} top={3.6} height={16.8} width={4.8} />
        </>
      );

    // ?
    case "mistake":
      return <Query x={12} top={2.8} scale={1} />;

    // ??
    case "blunder":
      return (
        <>
          <Query x={6.6} top={4.2} scale={0.84} />
          <Query x={17.4} top={4.2} scale={0.84} />
        </>
      );

    // ✕
    case "miss":
      return (
        <path
          d="M6.6 6.6 17.4 17.4M17.4 6.6 6.6 17.4"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.6"
          strokeLinecap="round"
        />
      );

    // ★
    case "best":
      return (
        <path
          d={STAR_PATH}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      );

    // 👍
    case "excellent":
      return (
        <>
          <rect x="3" y="10.2" width="4" height="10.4" rx="1.3" />
          <path d="M8.4 20.6V10.7L12.2 4.1C12.6 3.4 13.3 3 14.1 3.2C15.1 3.4 15.7 4.3 15.5 5.3L14.9 8.7H19.2C20.5 8.7 21.5 9.9 21.2 11.2L19.9 18C19.6 19.5 18.4 20.6 16.9 20.6Z" />
        </>
      );

    // ✓
    case "good":
      return (
        <path
          d="M5.2 12.4 9.7 16.9 18.8 7.3"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );

    // →
    case "forced":
      return (
        <path
          d="M4.6 12H18.8M12.6 5.8 18.8 12 12.6 18.2"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );

    // open book (book / theory move)
    default:
      return (
        <g stroke="currentColor" strokeWidth=".9" strokeLinejoin="round">
          <path d="M11 7.3C9.2 5.8 6.4 5.3 3.4 6.1V18.1C6.4 17.3 9.2 17.8 11 19.3Z" />
          <path d="M13 7.3C14.8 5.8 17.6 5.3 20.6 6.1V18.1C17.6 17.3 14.8 17.8 13 19.3Z" />
        </g>
      );
  }
}

/* -------------------------------------------------------------------------- */
/*  Badge                                                                     */
/* -------------------------------------------------------------------------- */

export function MoveBadge({ kind, size = "list", className = "" }: Props) {
  const config = MOVE_CLASSES[kind];
  const d = SIZE[size];
  const ring = d >= 40 ? 1.5 : 1;

  const style = {
    width: d,
    height: d,
    // Colour-agnostic shading: soft top light + gentle bottom depth over the
    // class colour, so it works with whatever `config.color` is.
    background: `
      radial-gradient(circle at 30% 16%, rgba(255,255,255,.36), transparent 52%),
      linear-gradient(180deg, rgba(255,255,255,.14) 0%, rgba(255,255,255,0) 48%, rgba(0,0,0,.2) 100%),
      ${config.color}
    `,
    boxShadow: [
      `inset 0 0 0 ${ring}px rgba(255,255,255,.22)`,
      `inset 0 -${n(d * 0.055)}px ${n(d * 0.09)}px rgba(0,0,0,.16)`,
      `0 ${n(d * 0.06)}px ${n(d * 0.14)}px rgba(0,0,0,.38)`,
    ].join(", "),
  } satisfies CSSProperties;

  const glyphShadow = {
    filter: `drop-shadow(0 ${n(d * 0.035)}px ${n(d * 0.03)}px rgba(0,0,0,.35))`,
  } satisfies CSSProperties;

  return (
    <span
      aria-hidden="true"
      title={config.label}
      className={`relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full text-white ${className}`}
      style={style}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-[78%] w-[78%] overflow-visible"
        style={glyphShadow}
        fill="currentColor"
        shapeRendering="geometricPrecision"
        focusable="false"
        aria-hidden="true"
      >
        <Glyph icon={config.icon} />
      </svg>
    </span>
  );
}
