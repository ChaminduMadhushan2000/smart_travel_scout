// ---------------------------------------------------------------------------
// BackgroundOrbs — the three blurred gradient orbs that sit behind the
// frosted glass card to create visual depth. Purely decorative.
// ---------------------------------------------------------------------------

export default function BackgroundOrbs() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-purple-600/30 blur-[120px]" />
      <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-blue-500/20 blur-[120px]" />
      <div className="absolute left-1/2 top-1/3 h-[300px] w-[300px] -translate-x-1/2 rounded-full bg-indigo-400/15 blur-[100px]" />
    </div>
  );
}
