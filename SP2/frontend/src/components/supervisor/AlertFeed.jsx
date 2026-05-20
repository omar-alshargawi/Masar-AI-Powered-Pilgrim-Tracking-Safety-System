const LEVEL_COLOR = { 1: "#f97316", 2: "#ef4444" };
const LEVEL_LABEL = { 1: "WARNING", 2: "CRITICAL" };

export default function AlertFeed({ alerts }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {alerts.length === 0 && (
        <p style={{ color: "#475569", fontSize: "12px", padding: "8px 0" }}>No alerts yet</p>
      )}
      {alerts.map((a, i) => (
        <div key={a.id ?? i} style={{
          background: "#0f172a",
          borderLeft: `3px solid ${LEVEL_COLOR[a.risk_level] || "#64748b"}`,
          borderRadius: "6px",
          padding: "8px 12px",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
            <span style={{ fontSize: "10px", fontWeight: 700, color: LEVEL_COLOR[a.risk_level] || "#64748b" }}>
              {LEVEL_LABEL[a.risk_level] || "ALERT"}
            </span>
            <span style={{ fontSize: "10px", color: "#475569" }}>
              {new Date(a.ts).toLocaleTimeString()}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: "12px", color: "#cbd5e1" }}>{a.message}</p>
        </div>
      ))}
    </div>
  );
}
