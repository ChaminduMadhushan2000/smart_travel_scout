interface SubmitButtonProps {
  loading?: boolean;
  disabled?: boolean;
}

export default function SubmitButton({
  loading = false,
  disabled = false,
}: SubmitButtonProps) {
  const isInactive = disabled || loading;

  return (
    <button
      type="submit"
      disabled={isInactive}
      style={{
        height: 50,
        padding: "0 20px",
        borderRadius: 16,
        background: "linear-gradient(135deg, #6366f1 0%, #818cf8 100%)",
        color: "white",
        fontWeight: 600,
        fontSize: 15,
        letterSpacing: "-0.01em",
        border: "none",
        cursor: isInactive ? "not-allowed" : "pointer",
        opacity: isInactive ? 0.55 : 1,
        boxShadow:
          "0 8px 24px rgba(99, 102, 241, 0.30), inset 0 1px 0 rgba(255,255,255,0.18)",
        transition: "transform 120ms ease, box-shadow 120ms ease",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        whiteSpace: "nowrap" as const,
        flexShrink: 0,
      }}
      className="submit-btn"
      onMouseEnter={(e) => {
        if (!isInactive) {
          e.currentTarget.style.transform = "translateY(-1px)";
          e.currentTarget.style.boxShadow =
            "0 12px 28px rgba(99, 102, 241, 0.38), inset 0 1px 0 rgba(255,255,255,0.18)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isInactive) {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow =
            "0 8px 24px rgba(99, 102, 241, 0.30), inset 0 1px 0 rgba(255,255,255,0.18)";
        }
      }}
      onMouseDown={(e) => {
        if (!isInactive) {
          e.currentTarget.style.transform = "scale(0.97)";
          e.currentTarget.style.boxShadow =
            "0 4px 12px rgba(99, 102, 241, 0.25)";
        }
      }}
      onMouseUp={(e) => {
        if (!isInactive) {
          e.currentTarget.style.transform = "translateY(-1px)";
          e.currentTarget.style.boxShadow =
            "0 12px 28px rgba(99, 102, 241, 0.38), inset 0 1px 0 rgba(255,255,255,0.18)";
        }
      }}
    >
      {loading && (
        <span
          style={{
            width: 18,
            height: 18,
            border: "2.5px solid rgba(255,255,255,0.3)",
            borderTopColor: "white",
            borderRadius: "50%",
            animation: "spin 0.6s linear infinite",
            display: "inline-block",
            flexShrink: 0,
          }}
        />
      )}
      {loading ? "Searching…" : "Find Experiences →"}
    </button>
  );
}
