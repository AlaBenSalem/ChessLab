import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";
import { haptic } from "../../lib/haptic";

/**
 * Round glowing key.
 *  - Sound on  → lit amber, like a lamp switch
 *  - Sound off → dim, sunk into the wood
 * The icon swaps with a spring and a ripple ring plays on every press.
 */
export function SoundToggle({
  muted,
  onToggle,
}: {
  muted: boolean;
  onToggle: () => void;
}) {
  const [pulse, setPulse] = useState(0);

  return (
    <motion.button
      type="button"
      onClick={() => {
        haptic(10);
        setPulse((p) => p + 1);
        onToggle();
      }}
      aria-pressed={muted}
      aria-label="Mute sounds"
      title={muted ? "Sound off" : "Sound on"}
      whileHover={{ scale: 1.07 }}
      whileTap={{ scale: 0.88, y: 2 }}
      transition={{ type: "spring", stiffness: 520, damping: 26 }}
      className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-full ring-1 ring-inset transition-[background,color,box-shadow] duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200 ${
        muted
          ? "bg-stone-800/90 text-stone-400 ring-white/10 shadow-[0_1px_0_rgba(0,0,0,0.4),inset_0_2px_6px_rgba(0,0,0,0.6)]"
          : "bg-gradient-to-b from-amber-300 to-amber-500 text-amber-950 ring-white/40 shadow-[0_3px_0_rgba(120,53,15,0.65),0_8px_16px_-4px_rgba(0,0,0,0.5),0_0_20px_rgba(251,191,36,0.35)]"
      }`}
    >
      {pulse > 0 && (
        <motion.span
          key={pulse}
          aria-hidden
          initial={{ scale: 0.7, opacity: 0.6 }}
          animate={{ scale: 1.9, opacity: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className={`pointer-events-none absolute inset-0 rounded-full border-2 ${
            muted ? "border-stone-400/60" : "border-amber-200/80"
          }`}
        />
      )}
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={muted ? "off" : "on"}
          initial={{ opacity: 0, scale: 0.4, rotate: -45 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          exit={{ opacity: 0, scale: 0.4, rotate: 45 }}
          transition={{ type: "spring", stiffness: 600, damping: 28 }}
          className="grid place-items-center"
        >
          {muted ? (
            <VolumeX size={20} strokeWidth={2.25} />
          ) : (
            <Volume2 size={20} strokeWidth={2.25} />
          )}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
