import { useState } from "react";
import { Download, Upload } from "lucide-react";

interface Props {
  disabled?: boolean;
  moveCount: number;
  getPgn: () => string;
}

export function PgnExportButton({ disabled = false, moveCount, getPgn }: Props) {
  const [open, setOpen] = useState(false);
  const [pgn, setPgn] = useState("");
  const [message, setMessage] = useState("");

  const openExport = () => {
    setPgn(getPgn());
    setMessage("");
    setOpen(true);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(pgn);
      setMessage("PGN copied to clipboard.");
    } catch {
      setMessage("Clipboard access is unavailable here. Use Download PGN instead.");
    }
  };

  const download = () => {
    const blob = new Blob([pgn], { type: "application/x-chess-pgn;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `chesslab-${new Date().toISOString().slice(0, 10)}.pgn`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setMessage("PGN downloaded.");
  };

  return (
    <>
      <button
        type="button"
        aria-label="Export PGN"
        title="Export PGN"
        disabled={disabled}
        onClick={openExport}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-stone-400 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
      >
        <Upload size={22} />
      </button>
      {open && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/65 p-4 backdrop-blur-sm">
          <section role="dialog" aria-modal="true" aria-labelledby="export-pgn-title" className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#242424] p-5 shadow-2xl sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-emerald-300">
                  <Download size={18} />
                  <h2 id="export-pgn-title" className="text-lg font-extrabold text-white">Export game</h2>
                </div>
                <p className="mt-1 text-sm text-stone-400">Portable Game Notation · {moveCount} plies</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm text-stone-300 transition-colors hover:bg-white/10 hover:text-white">Close</button>
            </div>
            <textarea readOnly value={pgn} aria-label="PGN export text" className="h-64 w-full resize-y rounded-xl border border-white/10 bg-[#171717] p-3 font-mono text-xs leading-relaxed text-stone-200 outline-none focus:border-emerald-400/50" />
            <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => void copy()} className="rounded-lg border border-white/10 px-4 py-2.5 text-sm font-semibold text-stone-200 transition-colors hover:bg-white/10">Copy PGN</button>
              <button type="button" onClick={download} className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-500"><Download size={16} /> Download .pgn</button>
            </div>
            <p role="status" aria-live="polite" className="mt-2 min-h-5 text-right text-xs text-emerald-300">{message}</p>
          </section>
        </div>
      )}
    </>
  );
}
