const MAX_QUERY_LENGTH = 500;

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  hint?: string;
}

export default function SearchInput({
  value,
  onChange,
  disabled = false,
  hint,
}: SearchInputProps) {
  const charCount = value.length;
  const nearLimit = charCount >= MAX_QUERY_LENGTH * 0.85;
  const overLimit = charCount > MAX_QUERY_LENGTH;

  return (
    <div style={{ minWidth: 0, flex: 1 }}>
      <div
        style={{
          position: "relative",
          height: 50,
          background: "rgba(255, 255, 255, 0.72)",
          border: hint
            ? "1px solid #f59e0b"
            : "1px solid rgba(148, 163, 184, 0.22)",
          borderRadius: 16,
          boxShadow: "inset 0 1px 2px rgba(15, 23, 42, 0.04)",
          transition: "border-color 200ms ease, box-shadow 200ms ease",
          opacity: disabled ? 0.5 : 1,
        }}
        onFocus={(e) => {
          if (!hint) {
            e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.45)";
            e.currentTarget.style.boxShadow =
              "0 0 0 3.5px rgba(99, 102, 241, 0.10), inset 0 1px 2px rgba(15,23,42,0.04)";
          }
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = hint
            ? "#f59e0b"
            : "rgba(148, 163, 184, 0.22)";
          e.currentTarget.style.boxShadow =
            "inset 0 1px 2px rgba(15, 23, 42, 0.04)";
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            display: "flex",
            alignItems: "center",
            paddingLeft: 16,
            pointerEvents: "none",
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="#94a3b8"
            style={{ width: 18, height: 18 }}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          maxLength={MAX_QUERY_LENGTH + 10}
          placeholder="Describe your dream trip..."
          aria-label="Describe your ideal travel experience"
          aria-invalid={!!hint || overLimit}
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 16,
            border: "none",
            background: "transparent",
            paddingLeft: 44,
            paddingRight: value ? 36 : 14,
            fontSize: 15,
            fontWeight: 500,
            color: "#0f172a",
            outline: "none",
            cursor: disabled ? "not-allowed" : "text",
          }}
        />

        {value && !disabled && (
          <button
            type="button"
            onClick={() => onChange("")}
            style={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-50%)",
              width: 24,
              height: 24,
              display: "grid",
              placeItems: "center",
              borderRadius: "50%",
              border: "none",
              background: "transparent",
              color: "#94a3b8",
              cursor: "pointer",
            }}
            aria-label="Clear search"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              style={{ width: 14, height: 14 }}
            >
              <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
            </svg>
          </button>
        )}
      </div>

      {(hint || nearLimit) && (
        <div
          style={{
            marginTop: 6,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingLeft: 4,
            paddingRight: 4,
          }}
        >
          {hint ? (
            <p
              style={{ fontSize: 12, fontWeight: 600, color: "#d97706" }}
              role="alert"
            >
              {hint}
            </p>
          ) : (
            <span />
          )}
          {nearLimit && (
            <p
              style={{
                fontSize: 12,
                color: overLimit ? "#ef4444" : "#94a3b8",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {charCount}/{MAX_QUERY_LENGTH}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
