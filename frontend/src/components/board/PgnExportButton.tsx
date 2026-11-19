import { Upload } from "lucide-react";

interface Props {
  disabled?: boolean;
  onClick: () => void;
}

export function PgnExportButton({ disabled = false, onClick }: Props) {
  return <button type="button" aria-label="Export PGN" title="Export PGN" disabled={disabled} onClick={onClick} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-stone-400 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"><Upload size={22} /></button>;
}
