import { Clock } from "lucide-react";

interface Props {
  text: string;
  running: boolean;
  low: boolean;
}

export function ClockBox({ text, running, low }: Props) {
  return (
    <div
      className={`flex h-[72px] shrink-0 items-center justify-end gap-3 rounded-lg px-5 font-semibold tabular-nums transition-colors ${
        running ? "bg-[#262626] text-white" : "bg-[#6b6b6b] text-stone-100"
      }`}
      aria-label={`Clock ${text}`}
    >
      {running && (
        <Clock
          size={32}
          strokeWidth={2.4}
          className={`mr-auto ${low ? "text-red-400" : "text-emerald-400"}`}
        />
      )}
      <span
        className={`text-[46px] leading-none tracking-wide ${low ? "text-red-400" : ""}`}
      >
        {text}
      </span>
    </div>
  );
}
