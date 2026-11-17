import { useState } from "react";
import { isMuted, setMuted } from "../lib/sounds";

/** Mute state kept in sync with the sounds module. */
export function useMute() {
  const [muted, setMutedState] = useState(() => isMuted());

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
  };

  return { muted, toggleMute };
}
