"use client";

import { useState } from "react";
import BackgroundOrbs from "@/components/BackgroundOrbs";
import GlobeIcon from "@/components/GlobeIcon";
import SearchForm from "@/components/SearchForm";
import { travelPackages, type TravelPackage } from "@/lib/data";

// ---------------------------------------------------------------------------
// Home — the single-page entry point.
// Manages search state, calls /api/search, and renders matched results.
// ---------------------------------------------------------------------------

interface SearchResult {
  package: TravelPackage;
  reason: string;
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    setResults([]);
    setHasSearched(true);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      const matches: SearchResult[] = (data.matches ?? [])
        .map((m: { id: number; reason: string }) => {
          const pkg = travelPackages.find((p) => p.id === m.id);
          return pkg ? { package: pkg, reason: m.reason } : null;
        })
        .filter(Boolean) as SearchResult[];

      setResults(matches);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e]">
      <BackgroundOrbs />

      <main className="relative z-10 mx-4 w-full max-w-2xl py-16">
        {/* Frosted glass card */}
        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.05] p-8 shadow-2xl backdrop-blur-xl sm:p-12">
          {/* Header */}
          <header className="mb-10 flex flex-col items-center text-center">
            <div className="mb-6">
              <GlobeIcon />
            </div>

            <h1 className="mb-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Smart Travel Scout
            </h1>

            <p className="max-w-md text-base leading-relaxed text-white/50 sm:text-lg">
              Describe your dream trip and let AI find the perfect experience
              from our curated Sri Lankan collection.
            </p>
          </header>

          {/* Search form */}
          <SearchForm
            query={query}
            onChange={setQuery}
            onSubmit={handleSearch}
            loading={loading}
          />

          {/* Trust footer */}
          <p className="mt-8 text-center text-xs tracking-wide text-white/20">
            Powered by AI &middot; Grounded to curated inventory only
          </p>
        </div>

        {/* ── Results Section ─────────────────────────────────────── */}

        {/* Loading skeleton */}
        {loading && (
          <div className="mt-6 space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.04] p-6 backdrop-blur-lg"
              >
                <div className="mb-3 h-5 w-2/3 rounded-lg bg-white/[0.08]" />
                <div className="mb-2 h-4 w-1/2 rounded-lg bg-white/[0.06]" />
                <div className="h-4 w-full rounded-lg bg-white/[0.04]" />
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/[0.08] p-6 backdrop-blur-lg">
            <p className="text-center text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* Results cards */}
        {!loading && !error && results.length > 0 && (
          <div className="mt-6 space-y-4">
            <p className="text-center text-sm font-medium tracking-wide text-white/40">
              {results.length} experience{results.length !== 1 && "s"} found
            </p>

            {results.map(({ package: pkg, reason }) => (
              <div
                key={pkg.id}
                className="group rounded-2xl border border-white/[0.08] bg-white/[0.05] p-6 backdrop-blur-lg transition-all duration-300 hover:border-indigo-500/20 hover:bg-white/[0.07]"
              >
                {/* Title & Price */}
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {pkg.title}
                    </h3>
                    <p className="mt-0.5 flex items-center gap-1.5 text-sm text-white/50">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 16 16"
                        fill="currentColor"
                        className="h-3.5 w-3.5"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="m7.539 14.841.003.003.002.002a.755.755 0 0 0 .912 0l.002-.002.003-.003.012-.009a5.57 5.57 0 0 0 .19-.153 15.588 15.588 0 0 0 2.046-2.082c1.101-1.362 2.291-3.342 2.291-5.597A5 5 0 0 0 3 7c0 2.255 1.19 4.235 2.291 5.597a15.591 15.591 0 0 0 2.236 2.235l.012.01ZM8 8.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {pkg.location}
                    </p>
                  </div>

                  {/* Price badge */}
                  <span className="shrink-0 rounded-xl bg-indigo-500/15 px-3 py-1.5 text-sm font-semibold text-indigo-300">
                    ${pkg.price}
                  </span>
                </div>

                {/* Tags */}
                <div className="mb-3 flex flex-wrap gap-2">
                  {pkg.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-lg bg-white/[0.06] px-2.5 py-0.5 text-xs font-medium text-white/40"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Why this matches */}
                <div className="flex items-start gap-2 rounded-xl bg-indigo-500/[0.06] px-3 py-2.5">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-400/70"
                    aria-hidden="true"
                  >
                    <path d="M7.324 3.073a.75.75 0 0 1 1.352 0l.47 1.066a.75.75 0 0 0 .398.398l1.066.47a.75.75 0 0 1 0 1.352l-1.066.47a.75.75 0 0 0-.398.398l-.47 1.066a.75.75 0 0 1-1.352 0l-.47-1.066a.75.75 0 0 0-.398-.398l-1.066-.47a.75.75 0 0 1 0-1.352l1.066-.47a.75.75 0 0 0 .398-.398l.47-1.066ZM3.29 10.218a.75.75 0 0 1 1.42 0l.216.614a.75.75 0 0 0 .44.44l.614.216a.75.75 0 0 1 0 1.42l-.614.216a.75.75 0 0 0-.44.44l-.216.614a.75.75 0 0 1-1.42 0l-.216-.614a.75.75 0 0 0-.44-.44l-.614-.216a.75.75 0 0 1 0-1.42l.614-.216a.75.75 0 0 0 .44-.44l.216-.614ZM11.727 10.218a.75.75 0 0 1 1.42 0l.216.614a.75.75 0 0 0 .44.44l.614.216a.75.75 0 0 1 0 1.42l-.614.216a.75.75 0 0 0-.44.44l-.216.614a.75.75 0 0 1-1.42 0l-.216-.614a.75.75 0 0 0-.44-.44l-.614-.216a.75.75 0 0 1 0-1.42l.614-.216a.75.75 0 0 0 .44-.44l.216-.614Z" />
                  </svg>
                  <p className="text-sm leading-relaxed text-indigo-200/70">
                    {reason}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state — searched but nothing matched */}
        {hasSearched && !loading && !error && results.length === 0 && (
          <div className="mt-6 rounded-2xl border border-white/[0.06] bg-white/[0.04] p-8 backdrop-blur-lg">
            <p className="text-center text-sm text-white/40">
              No matching experiences found. Try describing your ideal trip
              differently.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

