"use client";

import SearchInput from "@/components/SearchInput";
import SubmitButton from "@/components/SubmitButton";

// ---------------------------------------------------------------------------
// SearchForm — inline search row + quick-pick filter tags.
// ---------------------------------------------------------------------------

const QUICK_FILTERS = [
  "Beaches",
  "Nature",
  "Culture",
  "Under $100",
  "Adventure",
] as const;

interface SearchFormProps {
  query: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onChipSearch: (chipQuery: string) => void;
  loading: boolean;
  hint?: string;
}

export default function SearchForm({
  query,
  onChange,
  onSubmit,
  onChipSearch,
  loading,
  hint,
}: SearchFormProps) {
  return (
    <div>
      {/* Search row — input + button side by side */}
      <form onSubmit={onSubmit} className="search-row" style={{ display: "flex", gap: 10 }}>
        <SearchInput
          value={query}
          onChange={onChange}
          disabled={loading}
          hint={hint}
        />
        <SubmitButton loading={loading} disabled={!query.trim()} />
      </form>

      {/* Quick filter tags */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          marginTop: 16,
        }}
      >
        {QUICK_FILTERS.map((label) => {
          const isActive = query === label;
          return (
            <button
              key={label}
              type="button"
              disabled={loading}
              onClick={() => onChipSearch(label)}
              style={{
                borderRadius: 999,
                border: isActive
                  ? "1px solid rgba(99, 102, 241, 0.4)"
                  : "1px solid rgba(148, 163, 184, 0.2)",
                background: isActive
                  ? "rgba(99, 102, 241, 0.08)"
                  : "rgba(255, 255, 255, 0.55)",
                padding: "7px 14px",
                fontSize: 13,
                fontWeight: 500,
                color: isActive ? "#6366f1" : "#475569",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.5 : 1,
                transition: "all 150ms ease",
              }}
              onMouseEnter={(e) => {
                if (!loading && !isActive) {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.8)";
                  e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.25)";
                  e.currentTarget.style.color = "#6366f1";
                }
              }}
              onMouseLeave={(e) => {
                if (!loading && !isActive) {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.55)";
                  e.currentTarget.style.borderColor = "rgba(148, 163, 184, 0.2)";
                  e.currentTarget.style.color = "#475569";
                }
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
