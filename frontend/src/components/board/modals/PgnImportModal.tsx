import { PRIMARY_BTN } from "../styles";

interface Props {
  open: boolean;
  value: string;
  error: string | null;
  onChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}

const SECONDARY_BTN = "rounded-lg bg-white/10 px-3 py-2.5 text-[15px] font-semibold text-stone-100 transition-colors hover:bg-white/15";

export function PgnImportModal({ open, value, error, onChange, onClose, onSubmit }: Props) {
  if (!open) return null;
  return <div className="fixed inset-0 z-40 grid place-items-center bg-black/60 p-4"><section className="w-full max-w-md rounded-xl bg-[#2a2a2a] p-5 shadow-2xl"><div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-extrabold text-white">Import PGN</h2><button type="button" onClick={onClose} className={SECONDARY_BTN}>Close</button></div><textarea value={value} onChange={(event) => onChange(event.target.value)} className="h-40 w-full resize-none rounded-lg bg-black/40 p-3 font-mono text-xs text-white outline-none focus:ring-1 focus:ring-emerald-400" placeholder="Paste a PGN game here" aria-label="PGN game" /><button type="button" onClick={onSubmit} className={`${PRIMARY_BTN} mt-3 py-2.5 text-base`}>Load PGN</button>{error && <p role="alert" className="mt-2 text-sm text-red-300">{error}</p>}</section></div>;
}
