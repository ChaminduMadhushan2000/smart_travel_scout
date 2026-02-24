"use client";

import SearchInput from "@/components/SearchInput";
import SubmitButton from "@/components/SubmitButton";

// ---------------------------------------------------------------------------
// SearchForm — client component that owns the input state.
// Handles form submission (wired up in a future step).
// ---------------------------------------------------------------------------

export default function SearchForm() {
  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      className="space-y-4"
    >
      <SearchInput value="" onChange={() => {}} />
      <SubmitButton />
    </form>
  );
}
