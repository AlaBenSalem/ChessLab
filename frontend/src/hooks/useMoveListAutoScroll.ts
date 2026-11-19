import { useEffect, useRef } from "react";

// MoveList marks the currently viewed move with this attribute.
const ACTIVE_MOVE_SELECTOR = '[data-active="true"]';
const SCROLL_MARGIN_PX = 8;

/** Returns a ref for the move list's scroll container and keeps the active move visible inside it. */
export function useMoveListAutoScroll(viewIndex: number, moveCount: number) {
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const list = listRef.current;
    const active = list?.querySelector<HTMLElement>(ACTIVE_MOVE_SELECTOR);
    if (!list || !active) return;

    const top = active.offsetTop;
    const bottom = top + active.offsetHeight;
    if (top < list.scrollTop) {
      list.scrollTop = Math.max(0, top - SCROLL_MARGIN_PX);
    } else if (bottom > list.scrollTop + list.clientHeight) {
      list.scrollTop = bottom - list.clientHeight + SCROLL_MARGIN_PX;
    }
  }, [viewIndex, moveCount]);

  return listRef;
}
