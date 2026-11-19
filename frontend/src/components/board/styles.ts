export const PANEL = "rounded-xl bg-[#2a2a2a]";
export const PRIMARY_BTN = "flex w-full items-center justify-center gap-2 rounded-xl border-b-4 border-emerald-700 bg-emerald-500 px-4 py-3.5 text-lg font-extrabold text-white transition-colors hover:bg-emerald-400 active:translate-y-px active:border-b-2 disabled:opacity-50";
export const SECONDARY_BTN = "rounded-lg bg-white/10 px-3 py-2.5 text-[15px] font-semibold text-stone-100 transition-colors hover:bg-white/15";
export const optionClass = (active: boolean) => `rounded-lg border px-3 py-3 text-[15px] font-semibold transition-colors ${active ? "border-emerald-400 bg-emerald-400/15 text-white" : "border-white/10 bg-white/5 text-stone-300 hover:bg-white/10"}`;
