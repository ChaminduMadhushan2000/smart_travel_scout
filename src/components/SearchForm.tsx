"use client";

import SearchInput from "@/components/SearchInput";
import SubmitButton from "@/components/SubmitButton";

// ---------------------------------------------------------------------------
// SearchForm — presentational form shell.
// All state is owned by the parent; this component wires props to children.
// ---------------------------------------------------------------------------

interface SearchFormProps {
  query: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
}

export default function SearchForm({
  query,
  onChange,
  onSubmit,
  loading,
}: SearchFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <SearchInput value={query} onChange={onChange} disabled={loading} />
      <SubmitButton loading={loading} disabled={!query.trim()} />
    </form>
  );
}
