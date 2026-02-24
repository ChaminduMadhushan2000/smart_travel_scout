import BackgroundOrbs from "@/components/BackgroundOrbs";
import GlobeIcon from "@/components/GlobeIcon";
import SearchForm from "@/components/SearchForm";

// ---------------------------------------------------------------------------
// Home — the single-page entry point.
// Layout: full-screen gradient → frosted glass card → search form.
// This is a Server Component; interactivity lives in <SearchForm />.
// ---------------------------------------------------------------------------

export default function Home() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e]">
      <BackgroundOrbs />

      <main className="relative z-10 mx-4 w-full max-w-2xl">
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

          {/* Search form — client island */}
          <SearchForm />

          {/* Trust footer */}
          <p className="mt-8 text-center text-xs tracking-wide text-white/20">
            Powered by AI &middot; Grounded to curated inventory only
          </p>
        </div>
      </main>
    </div>
  );
}

