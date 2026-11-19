import { describe, expect, it } from "vitest";
import { formatClock, getClockDisplay } from "./clock";

describe("formatClock", () => {
  it("formats minutes and seconds with zero padding", () => {
    expect(formatClock(0)).toBe("00:00");
    expect(formatClock(65)).toBe("01:05");
    expect(formatClock(600)).toBe("10:00");
    expect(formatClock(3599)).toBe("59:59");
  });

  it("truncates fractional seconds", () => {
    expect(formatClock(59.9)).toBe("00:59");
  });

  it("clamps negative and non-finite values to zero", () => {
    expect(formatClock(-3)).toBe("00:00");
    expect(formatClock(Number.NaN)).toBe("00:00");
  });
});

describe("getClockDisplay", () => {
  it("shows a placeholder when no timed game is running", () => {
    expect(getClockDisplay({ enabled: false, unlimited: false, seconds: 30 })).toEqual({ text: "--:--", low: false });
  });

  it("shows infinity for untimed games and never flags them as low", () => {
    expect(getClockDisplay({ enabled: true, unlimited: true, seconds: 0 })).toEqual({ text: "∞", low: false });
  });

  it("flags the clock as low at 10 seconds or less", () => {
    expect(getClockDisplay({ enabled: true, unlimited: false, seconds: 10 }).low).toBe(true);
    expect(getClockDisplay({ enabled: true, unlimited: false, seconds: 10.5 }).low).toBe(false);
  });
});
