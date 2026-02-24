// ---------------------------------------------------------------------------
// GlobeIcon — floating globe emoji for the empty-state placeholder.
// ---------------------------------------------------------------------------

export default function GlobeIcon() {
  return (
    <span
      className="inline-block leading-none"
      style={{ fontSize: 42, animation: "float 3s ease-in-out infinite" }}
      role="img"
      aria-label="Globe"
    >
      🌍
    </span>
  );
}
