import { useEffect } from "react";

interface Options {
  /** Index of the move being viewed; -1 is the starting position. */
  viewIndex: number;
  lastIndex: number;
  setViewIndex: (index: number) => void;
}

function targetIndexForKey(key: string, viewIndex: number, lastIndex: number): number | null {
  switch (key) {
    case "ArrowLeft":
      return Math.max(-1, viewIndex - 1);
    case "ArrowRight":
      return Math.min(lastIndex, viewIndex + 1);
    case "ArrowUp":
    case "Home":
      return -1;
    case "ArrowDown":
    case "End":
      return lastIndex;
    default:
      return null;
  }
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}

/** Arrow keys / Home / End step through the game, unless the user is typing or using a shortcut. */
export function useHistoryKeyboardNavigation({ viewIndex, lastIndex, setViewIndex }: Options) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // Leave browser shortcuts (Alt+Left = back, Cmd+Left, ...) and form controls alone.
      if (event.altKey || event.ctrlKey || event.metaKey || isEditableTarget(event.target)) return;

      const next = targetIndexForKey(event.key, viewIndex, lastIndex);
      if (next === null) return;

      event.preventDefault();
      setViewIndex(next);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [viewIndex, lastIndex, setViewIndex]);
}
