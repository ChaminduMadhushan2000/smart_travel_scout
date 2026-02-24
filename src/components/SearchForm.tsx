"use client";

import SearchInput from "@/components/SearchInput";
import SubmitButton from "@/components/SubmitButton";

// ---------------------------------------------------------------------------
// SearchForm — presentational form shell.
// All state is owned by the parent; this component wires props to children.
// Shows a gentle validation hint when the user submits with an empty field.
// ---------------------------------------------------------------------------

interface SearchFormProps {
  query: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  /** Optional hint surfaced from parent (e.g. empty-submit nudge). */
  hint?: string;
}

export default function SearchForm({
  query,
  onChange,
  onSubmit,
  loading,
  hint,
}: SearchFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <SearchInput
        value={query}
        onChange={onChange}
        disabled={loading}
        hint={hint}
      />
      <SubmitButton loading={loading} disabled={!query.trim()} />
    </form>
  );
}
