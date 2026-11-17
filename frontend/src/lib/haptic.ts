/**
 * Short vibration on devices that support it (Android Chrome etc.).
 * iOS Safari ignores navigator.vibrate, so this is a silent no-op there.
 */
export function haptic(ms = 8): void {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(ms);
    }
  } catch {
    /* ignore */
  }
}
