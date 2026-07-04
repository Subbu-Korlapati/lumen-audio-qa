interface EmptyStateProps {
  onPick: (question: string) => void;
  disabled?: boolean;
}

// Questions that map to the shipped knowledge base, so a first-time user gets a
// grounded answer immediately and can see the citation behaviour.
const SUGGESTIONS = [
  "How long is the return window?",
  "Can I cancel my order after placing it?",
  "What does the warranty cover?",
  "How much is express shipping?",
];

export function EmptyState({ onPick, disabled }: EmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-md">
        <SparkIcon />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-slate-900">
        How can I help with your Lumen Audio order?
      </h2>
      <p className="mt-1 max-w-md text-sm text-slate-500">
        I answer using only Lumen Audio&apos;s published help articles, and I&apos;ll cite
        the source. If something isn&apos;t covered, I&apos;ll say so rather than guess.
      </p>

      <div className="mt-6 grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map((question) => (
          <button
            key={question}
            type="button"
            disabled={disabled}
            onClick={() => onPick(question)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700 shadow-sm transition hover:border-brand-300 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  );
}

function SparkIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3v4m0 10v4m9-9h-4M7 12H3m13.5-6.5-2.8 2.8M9.3 14.7l-2.8 2.8m11 0-2.8-2.8M9.3 9.3 6.5 6.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
