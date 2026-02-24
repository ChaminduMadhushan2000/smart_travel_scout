// ---------------------------------------------------------------------------
// SearchInput — frosted glass search field with leading magnifying-glass icon.
// Purely presentational; state is lifted to the parent.
// Shows an optional hint message below the input (validation, char count, etc.)
// ---------------------------------------------------------------------------

const MAX_QUERY_LENGTH = 500;

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** Optional hint shown below the input (e.g. "Please enter a query"). */
  hint?: string;
}

export default function SearchInput({
  value,
  onChange,
  disabled = false,
  hint,
}: SearchInputProps) {
  const charCount = value.length;
  const nearLimit = charCount >= MAX_QUERY_LENGTH * 0.85; // 85% → show count
  const overLimit = charCount > MAX_QUERY_LENGTH;

  return (
    <div>
      <div className="relative">
        {/* Leading icon */}
        <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-5 w-5 text-white/30"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
              clipRule="evenodd"
            />
          </svg>
        </div>

        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          maxLength={MAX_QUERY_LENGTH + 10} // soft buffer — Zod enforces on submit
          placeholder='e.g. "a chilled beach weekend with surfing vibes under $100"'
          aria-label="Describe your ideal travel experience"
          aria-invalid={!!hint || overLimit}
          className={[
            "w-full rounded-2xl border py-4 pl-12 pr-4 text-base text-white placeholder-white/25",
            "outline-none transition-all duration-300 sm:text-lg",
            "focus:border-indigo-500/50 focus:bg-white/[0.07] focus:ring-2 focus:ring-indigo-500/20",
            "disabled:cursor-not-allowed disabled:opacity-50",
            hint
              ? "border-amber-400/40 bg-white/[0.05]"
              : "border-white/[0.08] bg-white/[0.04]",
          ].join(" ")}
        />
      </div>

      {/* Footer row: hint on the left, character count on the right */}
      <div className="mt-2 flex items-center justify-between px-1">
        {/* Hint / validation message */}
        {hint ? (
          <p className="text-xs text-amber-300/80" role="alert">
            {hint}
          </p>
        ) : (
          <span /> /* empty spacer */
        )}

        {/* Character count — only visible when approaching the limit */}
        {nearLimit && (
          <p
            className={[
              "text-xs tabular-nums transition-colors",
              overLimit ? "text-red-400/80" : "text-white/25",
            ].join(" ")}
          >
            {charCount}/{MAX_QUERY_LENGTH}
          </p>
        )}
      </div>
    </div>
  );
}
