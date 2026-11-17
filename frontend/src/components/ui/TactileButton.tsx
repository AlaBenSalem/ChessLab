import { motion } from "framer-motion";
import type { HTMLMotionProps } from "framer-motion";
import { haptic } from "../../lib/haptic";

/**
 * A chunky "physical key" button.
 * Springs on hover, presses down on tap, and the shadow collapses.
 */
type Variant = "primary" | "blue" | "purple";

const BUTTON_BASE =
  "relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl px-5 py-2.5 font-bold " +
  "shadow-[0_3px_0_rgba(0,0,0,0.35),0_10px_18px_-6px_rgba(0,0,0,0.55)] ring-1 ring-inset ring-white/20 " +
  "transition-colors active:shadow-[0_1px_0_rgba(0,0,0,0.35)] " +
  "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:bg-white/10 " +
  "disabled:cursor-not-allowed disabled:opacity-50 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200";

const VARIANT: Record<Variant, string> = {
  primary: "bg-brand-green text-white hover:bg-brand-green-light",
  blue: "bg-blue-600 text-white hover:bg-blue-500",
  purple: "bg-purple-600 text-white hover:bg-purple-500",
};

type TactileProps = HTMLMotionProps<"button"> & { variant?: Variant };

export function TactileButton({
  variant = "primary",
  className = "",
  onClick,
  disabled,
  children,
  ...rest
}: TactileProps) {
  return (
    <motion.button
      type="button"
      disabled={disabled}
      onClick={(e) => {
        haptic();
        onClick?.(e);
      }}
      whileHover={disabled ? undefined : { scale: 1.02 }}
      whileTap={disabled ? undefined : { scale: 0.97, y: 2 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={`${BUTTON_BASE} ${VARIANT[variant]} ${className}`}
      {...rest}
    >
      {children}
    </motion.button>
  );
}
