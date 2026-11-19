import type { ReactNode } from "react";

interface Props {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}

export function NavButton({ label, onClick, disabled, children }: Props) {
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
