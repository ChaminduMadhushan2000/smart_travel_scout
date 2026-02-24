// ---------------------------------------------------------------------------
// BackgroundOrbs — radial-gradient blobs with slow drift animation.
// Exact match of the reference weather-app’s .blob-1, .blob-2, .blob-3.
// ---------------------------------------------------------------------------

export default function BackgroundOrbs() {
  return (
    <>
      {/* Blob 1 — purple-blue top-left */}
      <div
        style={{
          position: "fixed",
          width: 520,
          height: 520,
          top: -120,
          left: -80,
          background:
            "radial-gradient(circle, #a5b4fc, #818cf8 60%, transparent 70%)",
          borderRadius: "50%",
          filter: "blur(80px)",
          opacity: 0.55,
          animation: "drift 18s ease-in-out infinite alternate",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      {/* Blob 2 — pink bottom-right */}
      <div
        style={{
          position: "fixed",
          width: 440,
          height: 440,
          bottom: -60,
          right: -100,
          background:
            "radial-gradient(circle, #f9a8d4, #f472b6 50%, transparent 70%)",
          borderRadius: "50%",
          filter: "blur(80px)",
          opacity: 0.55,
          animation: "drift 22s ease-in-out infinite alternate-reverse",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      {/* Blob 3 — cyan center */}
      <div
        style={{
          position: "fixed",
          width: 360,
          height: 360,
          top: "40%",
          left: "50%",
          background:
            "radial-gradient(circle, #67e8f9, #22d3ee 50%, transparent 70%)",
          borderRadius: "50%",
          filter: "blur(80px)",
          opacity: 0.55,
          animation: "drift 16s ease-in-out 2s infinite alternate",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
    </>
  );
}
