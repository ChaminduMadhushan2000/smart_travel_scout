"use client";

import { useCallback, useRef, useState } from "react";
import BackgroundOrbs from "@/components/BackgroundOrbs";
import GlobeIcon from "@/components/GlobeIcon";
import SearchForm from "@/components/SearchForm";
import { packageById, type TravelPackage } from "@/lib/data";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SearchResult {
  package: TravelPackage;
  reason: string;
}

// ---------------------------------------------------------------------------
// Home — the single-page entry point.
// Owns every piece of search state and delegates rendering to sub-components.
// ---------------------------------------------------------------------------

export default function Home() {
  // ── State ───────────────────────────────────────────────────────────────
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [hint, setHint] = useState<string | undefined>();

  // Abort controller ref — lets us cancel an in-flight request on re-submit
  const abortRef = useRef<AbortController | null>(null);

  // ── Helpers ─────────────────────────────────────────────────────────────

  /** Reset to the initial state so the user can start fresh. */
  const resetSearch = useCallback(() => {
    setQuery("");
    setResults([]);
    setError(null);
    setHasSearched(false);
    setHint(undefined);
  }, []);

  // ── Submit handler ──────────────────────────────────────────────────────

  const handleSearch = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // — Guard: empty or whitespace-only query → show a helpful hint
      const trimmed = query.trim();
      if (!trimmed) {
        setHint("Tell us what you're looking for — even a vague idea works!");
        return;
      }

      // Clear any previous hint the moment the user submits something real
      setHint(undefined);

      // Don't double-fire while a request is already in flight
      if (loading) return;

      // Cancel a previous in-flight request (race condition guard)
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);
      setResults([]);
      setHasSearched(true);

      try {
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: trimmed }),
          signal: controller.signal,
        });

        // If the user started a new search while this one was in-flight, bail
        if (controller.signal.aborted) return;

        // Try to parse the response body regardless of status — the API always
        // returns JSON with either `matches` or `error`.
        let data: Record<string, unknown>;
        try {
          data = await res.json();
        } catch {
          setError("Received an unreadable response from the server.");
          return;
        }

        // Server returned an error message
        if (!res.ok) {
          setError(
            (data.error as string) ??
              "Something went wrong on our end. Please try again.",
          );
          return;
        }

        // Map returned IDs → local inventory. Unknown IDs are silently dropped.
        const matches: SearchResult[] = [];
        for (const m of (data.matches ?? []) as {
          id: number;
          reason: string;
        }[]) {
          const pkg = packageById.get(m.id);
          if (pkg) matches.push({ package: pkg, reason: m.reason });
        }

        setResults(matches);
      } catch (err) {
        // Aborted by the user (new search started) — do nothing
        if (err instanceof DOMException && err.name === "AbortError") return;

        setError(
          "Network error — please check your connection and try again.",
        );
      } finally {
        setLoading(false);
      }
    },
    [query, loading],
  );

  // ── Derived UI flags ────────────────────────────────────────────────────
  // Keeps the JSX clean — one boolean per visual state.

  const showSkeleton = loading;
  const showError = !loading && !!error;
  const showResults = !loading && !error && results.length > 0;
  const showEmpty = hasSearched && !loading && !error && results.length === 0;

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e]">
      <BackgroundOrbs />

      <main className="relative z-10 mx-4 w-full max-w-2xl py-16">
        {/* ── Frosted glass card ────────────────────────────────── */}
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

          {/* Search form — passes hint down so the input can highlight */}
          <SearchForm
            query={query}
            onChange={(v) => {
              setQuery(v);
              // Auto-clear the hint once the user starts typing again
              if (hint && v.trim()) setHint(undefined);
            }}
            onSubmit={handleSearch}
            loading={loading}
            hint={hint}
          />

          {/* Trust footer */}
          <p className="mt-8 text-center text-xs tracking-wide text-white/20">
            Powered by AI &middot; Grounded to curated inventory only
          </p>
        </div>

        {/* ── Results Section ─────────────────────────────────────── */}

        {/* Loading skeleton */}
        {showSkeleton && (
          <div className="mt-6 space-y-4" aria-busy="true" aria-live="polite">
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

        {/* Error state — friendly message + retry button */}
        {showError && (
          <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/[0.08] p-6 text-center backdrop-blur-lg">
            <p className="text-sm leading-relaxed text-red-300">{error}</p>

            <button
              type="button"
              onClick={handleSearch as unknown as React.MouseEventHandler}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-white/[0.06] px-4 py-2 text-xs font-medium text-white/60 transition-colors hover:bg-white/[0.1] hover:text-white/80"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                className="h-3.5 w-3.5"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M13.836 2.477a.75.75 0 0 1 .75.75v3.182a.75.75 0 0 1-.75.75h-3.182a.75.75 0 0 1 0-1.5h1.37l-.84-.841a4.5 4.5 0 0 0-7.08.932.75.75 0 0 1-1.3-.75 6 6 0 0 1 9.44-1.242l.842.84V3.227a.75.75 0 0 1 .75-.75Zm-.911 7.5A.75.75 0 0 1 13.199 11a6 6 0 0 1-9.44 1.241l-.84-.84v1.371a.75.75 0 0 1-1.5 0V9.591a.75.75 0 0 1 .75-.75H5.35a.75.75 0 1 1 0 1.5H3.98l.841.841a4.5 4.5 0 0 0 7.08-.932.75.75 0 0 1 1.025-.273Z"
                  clipRule="evenodd"
                />
              </svg>
              Try again
            </button>
          </div>
        )}

        {/* Results cards */}
        {showResults && (
          <div className="mt-6 space-y-4" aria-live="polite">
            <div className="flex items-center justify-between px-1">
              <p className="text-sm font-medium tracking-wide text-white/40">
                {results.length} experience
                {results.length !== 1 && "s"} found
              </p>

              {/* New search action */}
              <button
                type="button"
                onClick={resetSearch}
                className="text-xs font-medium text-indigo-400/60 transition-colors hover:text-indigo-300"
              >
                New search
              </button>
            </div>

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

        {/* Empty state — searched but nothing matched (conflicting / niche query) */}
        {showEmpty && (
          <div className="mt-6 rounded-2xl border border-white/[0.06] bg-white/[0.04] p-8 text-center backdrop-blur-lg">
            {/* Shrug icon */}
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.05]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-6 w-6 text-white/30"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                  clipRule="evenodd"
                />
              </svg>
            </div>

            <p className="mb-2 text-sm font-medium text-white/50">
              No matching experiences found
            </p>
            <p className="mx-auto max-w-sm text-xs leading-relaxed text-white/30">
              Your request may combine constraints that don&apos;t overlap in our
              current inventory (e.g. &quot;cold beach&quot;). Try focusing on
              one vibe — like &quot;relaxing beach trip&quot; or &quot;mountain
              hiking adventure&quot; — and we&apos;ll do our best.
            </p>

            {/* Try again link */}
            <button
              type="button"
              onClick={resetSearch}
              className="mt-5 inline-flex items-center gap-1.5 text-xs font-medium text-indigo-400/60 transition-colors hover:text-indigo-300"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                className="h-3.5 w-3.5"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M13.836 2.477a.75.75 0 0 1 .75.75v3.182a.75.75 0 0 1-.75.75h-3.182a.75.75 0 0 1 0-1.5h1.37l-.84-.841a4.5 4.5 0 0 0-7.08.932.75.75 0 0 1-1.3-.75 6 6 0 0 1 9.44-1.242l.842.84V3.227a.75.75 0 0 1 .75-.75Zm-.911 7.5A.75.75 0 0 1 13.199 11a6 6 0 0 1-9.44 1.241l-.84-.84v1.371a.75.75 0 0 1-1.5 0V9.591a.75.75 0 0 1 .75-.75H5.35a.75.75 0 1 1 0 1.5H3.98l.841.841a4.5 4.5 0 0 0 7.08-.932.75.75 0 0 1 1.025-.273Z"
                  clipRule="evenodd"
                />
              </svg>
              Start a new search
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

