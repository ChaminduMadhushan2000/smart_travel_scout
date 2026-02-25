"use client";

import { useCallback, useRef, useState } from "react";
import GlobeIcon from "@/components/GlobeIcon";
import SearchForm from "@/components/SearchForm";
import BackgroundOrbs from "@/components/BackgroundOrbs";
import { packageById, type TravelPackage } from "@/lib/data";
import type { SearchResponse, SearchErrorResponse } from "./api/search/route";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SearchResult {
  package: TravelPackage;
  reason: string;
}

// ---------------------------------------------------------------------------
// Greeting helper — time-aware, like the reference design.
// ---------------------------------------------------------------------------

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// ---------------------------------------------------------------------------
// Home — premium glassmorphism single-page entry point.
// ---------------------------------------------------------------------------

export default function Home() {
  // ── State ───────────────────────────────────────────────────────────────
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [hint, setHint] = useState<string | undefined>();
  const [apiHint, setApiHint] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  // ── Helpers ─────────────────────────────────────────────────────────────

  const resetSearch = useCallback(() => {
    setQuery("");
    setResults([]);
    setError(null);
    setHasSearched(false);
    setHint(undefined);
    setApiHint(null);
  }, []);

  // ── Core search logic (reused by form submit and chip clicks) ───────────

  const performSearch = useCallback(
    async (trimmedQuery: string) => {
      if (loading) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);
      setResults([]);
      setApiHint(null);
      setHasSearched(true);

      try {
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: trimmedQuery }),
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        let data: SearchResponse | SearchErrorResponse;
        try {
          data = await res.json();
        } catch {
          setError("Received an unreadable response from the server.");
          return;
        }

        if (!res.ok) {
          setError(
            "error" in data
              ? data.error
              : "Something went wrong on our end. Please try again.",
          );
          return;
        }

        const body = data as SearchResponse;
        const matches: SearchResult[] = [];
        for (const m of body.matches) {
          const pkg = packageById.get(m.id);
          if (pkg) matches.push({ package: pkg, reason: m.reason });
        }

        if (body.hint) setApiHint(body.hint);
        setResults(matches);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(
          "Network error — please check your connection and try again.",
        );
      } finally {
        setLoading(false);
      }
    },
    [loading],
  );

  // ── Submit handler ──────────────────────────────────────────────────────

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      const trimmed = query.trim();
      if (!trimmed) {
        setHint("Tell us what you're looking for — even a vague idea works!");
        return;
      }

      setHint(undefined);
      performSearch(trimmed);
    },
    [query, performSearch],
  );

  // ── Chip click — sets the query text AND triggers search immediately ────

  const handleChipSearch = useCallback(
    (chipQuery: string) => {
      setQuery(chipQuery);
      setHint(undefined);
      performSearch(chipQuery);
    },
    [performSearch],
  );

  // ── Derived flags ───────────────────────────────────────────────────────

  const showSkeleton = loading;
  const showError = !loading && !!error;
  const showResults = !loading && !error && results.length > 0;
  const showEmpty = hasSearched && !loading && !error && results.length === 0;
  const showPlaceholder = !hasSearched && !loading;

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 16px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <BackgroundOrbs />
      <main className="travel-card" style={{ position: "relative", zIndex: 1 }}>
        {/* Badge */}
        <div
          style={{
            display: "inline-flex",
            alignSelf: "flex-start",      
            width: "fit-content", 
            background: "rgba(99, 102, 241, 0.1)",
            color: "#6366f1",
            borderRadius: 999,
            padding: "5px 12px",
            fontSize: 10.5,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            border: "1px solid rgba(99, 102, 241, 0.18)",
          }}
        >
          AI Travel Assistant
        </div>

        {/* Headline */}
        <h1 className="travel-headline">
          {getGreeting()},
          <br />
          discover your perfect getaway.
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: 14,
            fontWeight: 400,
            color: "#64748b",
            letterSpacing: "-0.01em",
            marginTop: 4,
          }}
        >
          AI-powered recommendations from our{" "}
          <span style={{ fontWeight: 700, color: "#6366f1" }}>
            curated Sri Lankan
          </span>{" "}
          collection.
        </p>

        {/* Search form  */}
        <SearchForm
          query={query}
          onChange={(v) => {
            setQuery(v);
            if (hint && v.trim()) setHint(undefined);
          }}
          onSubmit={handleSearch}
          onChipSearch={handleChipSearch}
          loading={loading}
          hint={hint}
        />

        {/* ── Results area ──────────────────────────────────────── */}

        {/* Placeholder — before any search */}
        {showPlaceholder && (
          <div
            style={{
              background: "rgba(255, 255, 255, 0.35)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              borderRadius: 22,
              border: "1px dashed rgba(148, 163, 184, 0.35)",
              padding: "32px 20px",
              textAlign: "center",
            }}
          >
            <div style={{ marginBottom: 12 }}>
              <GlobeIcon />
            </div>
            <p style={{ fontSize: 14, color: "#64748b", maxWidth: 260, margin: "0 auto" }}>
              Search or tap a tag above to see your personalized travel
              itinerary.
            </p>
          </div>
        )}

        {/* Loading skeleton */}
        {showSkeleton && (
          <div
            className="animate-pulse"
            style={{
              marginTop: 20,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
            aria-busy="true"
            aria-live="polite"
          >
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  background: "white",
                  borderRadius: 16,
                  border: "1px solid #f1f5f9",
                  padding: 20,
                }}
              >
                <div
                  className="skeleton-shimmer"
                  style={{ height: 16, width: "60%", marginBottom: 10 }}
                />
                <div
                  className="skeleton-shimmer"
                  style={{ height: 14, width: "40%", marginBottom: 8 }}
                />
                <div
                  className="skeleton-shimmer"
                  style={{ height: 14, width: "100%" }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {showError && (
          <div
            className="animate-shake"
            style={{
              borderRadius: 16,
              border: "1px solid #fecaca",
              background: "#fef2f2",
              padding: 20,
              textAlign: "center",
              marginTop: 20,
            }}
          >
            <p style={{ fontSize: 14, color: "#dc2626", marginBottom: 12 }}>
              {error}
            </p>
            <button
              type="button"
              onClick={handleSearch as unknown as React.MouseEventHandler}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                borderRadius: 999,
                border: "1px solid #fecaca",
                background: "white",
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 600,
                color: "#dc2626",
                cursor: "pointer",
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                style={{ width: 14, height: 14 }}
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M13.836 2.477a.75.75 0 0 1 .75.75v3.182a.75.75 0 0 1-.75.75h-3.182a.75.75 0 0 1 0-1.5h1.37l-.84-.841a4.5 4.5 0 0 0-7.08.932.75.75 0 0 1-1.3-.75 6 6 0 0 1 9.44-1.242l.842.84V3.227a.75.75 0 0 1 .75-.75Zm-.911 7.5A.75.75 0 0 1 13.199 11a6 6 0 0 1-9.44 1.241l-.84-.84v1.371a.75.75 0 0 1-1.5 0V9.591a.75.75 0 0 1 .75-.75H5.35a.75.75 0 0 1 0 1.5H3.98l.841.841a4.5 4.5 0 0 0 7.08-.932.75.75 0 0 1 1.025-.273Z"
                  clipRule="evenodd"
                />
              </svg>
              Try again
            </button>
          </div>
        )}

        {/* Results cards */}
        {showResults && (
          <div style={{ marginTop: 20 }} aria-live="polite">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <p style={{ fontSize: 13, fontWeight: 500, color: "#94a3b8" }}>
                {results.length} experience
                {results.length !== 1 && "s"} found
              </p>
              <button
                type="button"
                onClick={resetSearch}
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#7c3aed",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                New search
              </button>
            </div>

            {results.map(({ package: pkg, reason }, idx) => (
              <div
                key={pkg.id}
                style={{
                  background: "white",
                  borderRadius: 16,
                  border: "1px solid #f1f5f9",
                  padding: 20,
                  marginBottom: 10,
                  boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
                  animation: `fadeSlideIn 0.4s ${idx * 0.08}s both`,
                }}
              >
                {/* Title & location/price */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 12,
                  }}
                >
                  <div>
                    <h3
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: "#0f172a",
                        margin: 0,
                      }}
                    >
                      {pkg.title}
                    </h3>
                    <p
                      style={{
                        fontSize: 13,
                        color: "#64748b",
                        marginTop: 4,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 16 16"
                        fill="currentColor"
                        style={{ width: 12, height: 12, flexShrink: 0 }}
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="m7.539 14.841.003.003.002.002a.755.755 0 0 0 .912 0l.002-.002.003-.003.012-.009a5.57 5.57 0 0 0 .19-.153 15.588 15.588 0 0 0 2.046-2.082c1.101-1.362 2.291-3.342 2.291-5.597A5 5 0 0 0 3 7c0 2.255 1.19 4.235 2.291 5.597a15.591 15.591 0 0 0 2.236 2.235l.012.01ZM8 8.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {pkg.location} · ${pkg.price}
                    </p>
                  </div>
                </div>

                {/* Tags */}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
                    marginTop: 10,
                  }}
                >
                  {pkg.tags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        borderRadius: 999,
                        background: "#f3f4f6",
                        padding: "3px 10px",
                        fontSize: 11,
                        fontWeight: 500,
                        color: "#6b7280",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Why this matches */}
                <p
                  style={{
                    marginTop: 10,
                    fontSize: 13,
                    fontWeight: 500,
                    color: "#7c3aed",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 6,
                  }}
                >
                  <span style={{ flexShrink: 0 }}>✦</span>
                  <span>{reason}</span>
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Empty state — no matches */}
        {showEmpty && (
          <div
            style={{
              background: "rgba(255, 255, 255, 0.35)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              borderRadius: 22,
              border: "1px dashed rgba(148, 163, 184, 0.35)",
              padding: "32px 20px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: "#f1f5f9",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12,
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="#94a3b8"
                style={{ width: 20, height: 20 }}
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                  clipRule="evenodd"
                />
              </svg>
            </div>

            <p
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#475569",
                marginBottom: 4,
              }}
            >
              No matching experiences
            </p>
            <p
              style={{
                fontSize: 13,
                color: "#94a3b8",
                maxWidth: 280,
                margin: "0 auto",
              }}
            >
              {apiHint ??
                "Your request may combine constraints that don\u2019t overlap. Try focusing on one vibe."}
            </p>

            <button
              type="button"
              onClick={resetSearch}
              style={{
                marginTop: 16,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                borderRadius: 999,
                background: "#f5f3ff",
                border: "none",
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 600,
                color: "#7c3aed",
                cursor: "pointer",
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                style={{ width: 14, height: 14 }}
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M13.836 2.477a.75.75 0 0 1 .75.75v3.182a.75.75 0 0 1-.75.75h-3.182a.75.75 0 0 1 0-1.5h1.37l-.84-.841a4.5 4.5 0 0 0-7.08.932.75.75 0 0 1-1.3-.75 6 6 0 0 1 9.44-1.242l.842.84V3.227a.75.75 0 0 1 .75-.75Zm-.911 7.5A.75.75 0 0 1 13.199 11a6 6 0 0 1-9.44 1.241l-.84-.84v1.371a.75.75 0 0 1-1.5 0V9.591a.75.75 0 0 1 .75-.75H5.35a.75.75 0 0 1 0 1.5H3.98l.841.841a4.5 4.5 0 0 0 7.08-.932.75.75 0 0 1 1.025-.273Z"
                  clipRule="evenodd"
                />
              </svg>
              Start a new search
            </button>
          </div>
        )}

        {/* Footer */}
        <p
          style={{
            fontSize: 12,
            color: "#94a3b8",
            textAlign: "center",
            marginTop: 28,
          }}
        >
          Built by ChaminduCode · Smart Travel Scout
        </p>
      </main>
    </div>
  );
}

