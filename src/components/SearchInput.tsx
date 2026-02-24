// ---------------------------------------------------------------------------
// SearchInput — frosted glass search field with leading magnifying-glass icon.
// Purely presentational; state is lifted to the parent.
// ---------------------------------------------------------------------------

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function SearchInput({
  value,
  onChange,
  disabled = false,
}: SearchInputProps) {
  return (
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
        placeholder='e.g. "a chilled beach weekend with surfing vibes under $100"'
        aria-label="Describe your ideal travel experience"
        className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] py-4 pl-12 pr-4 text-base text-white placeholder-white/25 outline-none transition-all duration-300 focus:border-indigo-500/50 focus:bg-white/[0.07] focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50 sm:text-lg"
      />
    </div>
  );
}
