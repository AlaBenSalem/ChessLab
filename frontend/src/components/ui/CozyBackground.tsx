import { motion, useReducedMotion } from "framer-motion";

const EMBERS = Array.from({ length: 16 }, (_, i) => ({
  left: (i * 53 + 7) % 100,
  size: 2 + (i % 4),
  duration: 16 + (i % 7) * 3,
  delay: (i * 0.9) % 9,
  drift: ((i % 5) - 2) * 22,
}));

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.5'/%3E%3C/svg%3E\")";

export function CozyBackground() {
  const reduce = useReducedMotion();

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* walnut base */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 35%, #4b2f1e 0%, #2e1c12 45%, #140b07 100%)",
        }}
      />

      {/* lamp glow, top-left — breathes like a candle */}
      <motion.div
        className="absolute -left-32 -top-32 h-[34rem] w-[34rem] rounded-full bg-amber-500/25 blur-3xl"
        animate={reduce ? undefined : { opacity: [0.6, 1, 0.7, 0.95, 0.6] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* ember glow, bottom-right */}
      <motion.div
        className="absolute -bottom-40 -right-32 h-[30rem] w-[30rem] rounded-full bg-orange-700/20 blur-3xl"
        animate={reduce ? undefined : { opacity: [0.5, 0.85, 0.55] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* soft pool of light behind the board */}
      <div className="absolute left-1/2 top-1/2 h-[70vmin] w-[70vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-200/[0.07] blur-3xl" />

      {/* drifting embers */}
      {!reduce &&
        EMBERS.map((e, i) => (
          <motion.span
            key={i}
            className="absolute -bottom-4 rounded-full bg-amber-300/70 blur-[1px]"
            style={{ left: `${e.left}%`, width: e.size, height: e.size }}
            initial={{ y: "0vh", x: 0, opacity: 0 }}
            animate={{
              y: ["0vh", "-110vh"],
              x: [0, e.drift],
              opacity: [0, 0.7, 0],
            }}
            transition={{
              duration: e.duration,
              delay: e.delay,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ))}

      {/* film grain */}
      <div
        className="absolute inset-0 opacity-[0.08] mix-blend-overlay"
        style={{ backgroundImage: GRAIN }}
      />
      {/* vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.55)_100%)]" />
    </div>
  );
}
