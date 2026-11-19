import type { ReactNode } from "react";

interface Props {
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: ReactNode;
}

export function RailButton({ label, onClick, active, disabled, children }: Props) {
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
