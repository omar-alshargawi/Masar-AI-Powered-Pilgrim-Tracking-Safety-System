const STYLES = {
  0: { bg: "#16a34a", text: "SAFE" },
  1: { bg: "#ea580c", text: "WARNING" },
  2: { bg: "#dc2626", text: "CRITICAL" },
};

export default function StatusBadge({ label }) {
  const style = STYLES[label] ?? { bg: "#475569", text: "UNKNOWN" };
  return (
    <span
      style={{
        background: style.bg,
        color: "#fff",
        fontSize: "11px",
        fontWeight: 700,
        padding: "2px 8px",
        borderRadius: "9999px",
        letterSpacing: "0.05em",
      }}
    >
      {style.text}
    </span>
  );
}
