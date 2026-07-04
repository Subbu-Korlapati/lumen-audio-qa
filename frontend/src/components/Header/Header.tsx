import type { HealthState } from "@/hooks/useHealth";

interface HeaderProps {
  health: HealthState;
  onClear: () => void;
  canClear: boolean;
}

const STATUS: Record<HealthState, { label: string; dot: string }> = {
  checking: { label: "Connecting\u2026", dot: "bg-amber-400" },
  online: { label: "Online", dot: "bg-emerald-500" },
  offline: { label: "Backend offline", dot: "bg-rose-500" },
};

export function Header({ health, onClear, canClear }: HeaderProps) {
  const status = STATUS[health];

  return (
    <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white/80 px-5 py-4 backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
          <LogoIcon />
        </div>
        <div>
          <h1 className="text-base font-semibold leading-tight text-slate-900">
            Lumen Audio
          </h1>
          <p className="text-xs text-slate-500">Support assistant</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <span className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <span className={`h-2 w-2 rounded-full ${status.dot}`} aria-hidden />
          {status.label}
        </span>
        <button
          type="button"
          onClick={onClear}
          disabled={!canClear}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          New chat
        </button>
      </div>
    </header>
  );
}

function LogoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 13a8 8 0 0 1 16 0v4a2 2 0 0 1-2 2h-1a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h2m-16 0h2a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H6a2 2 0 0 1-2-2v-4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
