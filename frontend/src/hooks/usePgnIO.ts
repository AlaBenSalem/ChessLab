import { useState } from "react";

interface Options {
  loadPgn: (pgn: string) => string | null;
  cancelAnalysis: () => void;
  buildExportPgn: () => string;
}

export function usePgnIO({ loadPgn, cancelAnalysis, buildExportPgn }: Options) {
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportText, setExportText] = useState("");
  const [exportMessage, setExportMessage] = useState("");

  const submitImport = () => {
    cancelAnalysis();
    const error = loadPgn(importText);
    if (error) setImportError(error);
    else {
      setImportOpen(false);
      setImportText("");
      setImportError(null);
    }
  };

  const openExport = () => {
    setExportText(buildExportPgn());
    setExportMessage("");
    setExportOpen(true);
  };

  const copyExport = async () => {
    try {
      await navigator.clipboard.writeText(exportText);
      setExportMessage("PGN copied to clipboard.");
    } catch {
      setExportMessage("Clipboard access is unavailable here. Use Download PGN instead.");
    }
  };

  const downloadExport = () => {
    const blob = new Blob([exportText], { type: "application/x-chess-pgn;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `chesslab-${new Date().toISOString().slice(0, 10)}.pgn`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setExportMessage("PGN downloaded.");
  };

  const closeImport = () => {
    setImportOpen(false);
    setImportError(null);
  };

  return {
    importOpen, setImportOpen, importText, setImportText, importError, closeImport, submitImport,
    exportOpen, exportText, exportMessage, openExport, closeExport: () => setExportOpen(false), copyExport, downloadExport,
  };
}
