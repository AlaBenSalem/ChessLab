import { describe, expect, it } from "vitest";
import { getPlayerInfo } from "./playerInfo";

const base = { headers: {}, computerMode: false, computerColor: null, engineRating: "800-1000" } as const;

describe("getPlayerInfo", () => {
  it("labels the engine and the human in computer mode", () => {
    const ctx = { ...base, computerMode: true, computerColor: "b" } as const;
    expect(getPlayerInfo("b", ctx)).toEqual({ name: "Stockfish", rating: "800-1000", engine: true });
    expect(getPlayerInfo("w", ctx)).toEqual({ name: "You", rating: "Unrated", engine: false });
  });

  it("reads names and ratings from PGN headers", () => {
    const headers = { White: "Alice", Black: "Bob", WhiteElo: "1500", BlackElo: "1600" };
    expect(getPlayerInfo("w", { ...base, headers })).toEqual({ name: "Alice", rating: "1500", engine: false });
    expect(getPlayerInfo("b", { ...base, headers })).toEqual({ name: "Bob", rating: "1600", engine: false });
  });

  it('treats "?" and missing values as unknown', () => {
    const headers = { White: "?", WhiteElo: "?" };
    expect(getPlayerInfo("w", { ...base, headers })).toEqual({ name: "White", rating: "Unrated", engine: false });
    expect(getPlayerInfo("b", base)).toEqual({ name: "Black", rating: "Unrated", engine: false });
  });
});
