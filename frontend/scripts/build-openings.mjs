// scripts/build-openings.mjs
// Reads Lichess ECO TSV (3-column or 5-column) and produces openings.json
// with a computed FEN for each opening line.
//
// Uses chess.js to convert PGN → FEN.

import fs from "node:fs";
import path from "node:path";
import { Chess } from "chess.js";

const OPENINGS_DIR = path.join(process.cwd(), "public", "openings");
const VOLUMES = ["a", "b", "c", "d", "e"];

const entries = [];
let totalLines = 0;
let skipped = 0;

for (const vol of VOLUMES) {
  const tsvPath = path.join(OPENINGS_DIR, `${vol}.tsv`);
  if (!fs.existsSync(tsvPath)) {
    console.warn(`⚠ Skipping ${vol}.tsv (not found)`);
    continue;
  }

  let content = fs.readFileSync(tsvPath, "utf-8");
  if (content.charCodeAt(0) === 0xfeff) content = content.slice(1);
  content = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  const lines = content.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    console.warn(`⚠ ${vol}.tsv is empty`);
    continue;
  }

  const header = lines[0].split("\t").map((s) => s.trim());
  console.log(
    `[${vol}.tsv] Header: ${header.join(" | ")}  (${header.length} columns)`,
  );

  const idxEco = header.indexOf("eco");
  const idxName = header.indexOf("name");
  const idxPgn = header.indexOf("pgn");

  if (idxEco < 0 || idxName < 0 || idxPgn < 0) {
    console.error(
      `🔴 ${vol}.tsv missing required columns: ${header.join(", ")}`,
    );
    continue;
  }

  let parsed = 0;
  for (let i = 1; i < lines.length; i++) {
    totalLines++;
    const cols = lines[i].split("\t");
    if (cols.length <= Math.max(idxEco, idxName, idxPgn)) {
      skipped++;
      continue;
    }

    const eco = (cols[idxEco] ?? "").trim();
    const name = (cols[idxName] ?? "").trim();
    const pgn = (cols[idxPgn] ?? "").trim();

    if (!eco || !name || !pgn) {
      skipped++;
      continue;
    }

    // 🔴 Compute FEN from the PGN sequence
    let fen = "";
    try {
      const chess = new Chess();
      // PGN move sequences from Lichess look like "1. e4 e5 2. Nf3"
      // strip the move numbers, keep only SAN tokens
      const cleanedPgn = pgn.replace(/\d+\.\s*/g, "");
      const moves = cleanedPgn
        .split(/\s+/)
        .filter((m) => m.length > 0 && m !== "...");
      for (const move of moves) {
        chess.move(move);
      }
      fen = chess.fen();
    } catch (err) {
      skipped++;
      continue;
    }

    if (!fen) {
      skipped++;
      continue;
    }

    entries.push({
      eco,
      name,
      pgn,
      fen,
    });
    parsed++;
  }

  console.log(
    `[${vol}.tsv] Parsed ${parsed} valid openings, skipped ${lines.length - 1 - parsed}`,
  );
}

entries.sort((a, b) => a.fen.localeCompare(b.fen));

const outputPath = path.join(OPENINGS_DIR, "openings.json");
fs.writeFileSync(outputPath, JSON.stringify(entries), "utf-8");

const sizeKB = (fs.statSync(outputPath).size / 1024).toFixed(1);
console.log("");
console.log("═══════════════════════════════════");
console.log(`✅ Wrote ${entries.length} openings to ${outputPath}`);
console.log(`   File size: ${sizeKB} KB`);
console.log(`   Total lines processed: ${totalLines}`);
console.log(`   Skipped: ${skipped}`);
console.log("═══════════════════════════════════");
