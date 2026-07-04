interface SourcesProps {
  sources: string[];
}

/** Renders the cited source article filenames beneath a grounded answer. */
export function Sources({ sources }: SourcesProps) {
  if (sources.length === 0) return null;

  return (
    <div className="mt-3 border-t border-slate-200/70 pt-2">
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {sources.length === 1 ? "Source" : "Sources"}
      </p>
      <ul className="flex flex-wrap gap-1.5">
        {sources.map((source) => (
          <li key={source}>
            <span className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-2 py-1 text-xs font-medium text-brand-700">
              <DocIcon />
              {source}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DocIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M14 3v4a1 1 0 0 0 1 1h4M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
