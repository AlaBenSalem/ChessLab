import { Bell, User } from "lucide-react";

/** Desktop-only account shortcuts above the right column. Currently presentational. */
export function UserActions() {
  return (
    <div className="hidden h-10 shrink-0 items-center justify-end gap-3 lg:flex">
      <button
        type="button"
        aria-label="Notifications"
        className="grid h-9 w-9 place-items-center rounded-lg text-stone-500 transition-colors hover:bg-white/5 hover:text-stone-200"
      >
        <Bell size={22} />
      </button>
      <div
        aria-hidden
        className="grid h-9 w-9 place-items-center rounded-full bg-[#3b3b3b] text-stone-300"
      >
        <User size={18} />
      </div>
    </div>
  );
}
