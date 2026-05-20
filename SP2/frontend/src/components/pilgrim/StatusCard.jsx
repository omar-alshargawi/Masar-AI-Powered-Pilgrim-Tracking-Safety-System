const CONFIG = {
  0: { label: "SAFE",     bg: "#052e16", border: "#22c55e", text: "#22c55e",  icon: "✓" },
  1: { label: "WARNING",  bg: "#431407", border: "#f97316", text: "#f97316",  icon: "⚠" },
  2: { label: "CRITICAL", bg: "#450a0a", border: "#ef4444", text: "#ef4444",  icon: "🔴" },
};
const DEFAULT = { label: "NO DATA", bg: "#1e293b", border: "#334155", text: "#64748b", icon: "?" };

export default function StatusCard({ label, confidence }) {
  const c = label != null ? (CONFIG[label] ?? DEFAULT) : DEFAULT;

  return (
    <div style={{
      background: c.bg,
      border: `2px solid ${c.border}`,
      borderRadius: "16px",
      padding: "28px 32px",
      textAlign: "center",
      transition: "background 0.5s, border-color 0.5s",
    }}>
      <div style={{ fontSize: "48px", marginBottom: "8px" }}>{c.icon}</div>
      <div style={{ fontSize: "28px", fontWeight: 900, color: c.text, letterSpacing: "2px" }}>
        {c.label}
      </div>
      {confidence != null && (
        <div style={{ marginTop: "8px", fontSize: "13px", color: "#94a3b8" }}>
          Confidence: {(confidence * 100).toFixed(0)}%
        </div>
      )}
    </div>
  );
}
