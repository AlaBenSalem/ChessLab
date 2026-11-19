import { useCallback, useEffect, useState } from "react";
import { getOpeningForMoves, isBookLoaded, loadOpeningBook } from "../lib/openingBook";

type Opening = ReturnType<typeof getOpeningForMoves>;

/**
 * Loads the opening book once and returns a lookup function. The lookup
 * yields `null` until the book is ready (or if it failed to load), so callers
 * can fall back to PGN headers without checking readiness themselves.
 */
export function useOpeningLookup(): (sanMoves: string[]) => Opening | null {
  const [ready, setReady] = useState(isBookLoaded);

  useEffect(() => {
    let active = true;
    loadOpeningBook()
      .then(() => {
        if (active) setReady(true);
      })
      .catch((error: unknown) => {
        console.error("Failed to load the opening book:", error);
      });
    return () => {
      active = false;
    };
  }, []);

  return useCallback(
    (sanMoves: string[]) => (ready ? getOpeningForMoves(sanMoves) : null),
    [ready],
  );
}
