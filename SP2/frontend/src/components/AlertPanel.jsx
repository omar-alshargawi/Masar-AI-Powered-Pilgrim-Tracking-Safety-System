import { useEffect, useRef } from "react";
import StatusBadge from "./StatusBadge";

export default function AlertPanel({ alerts }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [alerts.length]);

  return (
    <div
      style={{
        height: "160px",
        overflowY: "auto",
        borderTop: "1px solid #1e293b",
        padding: "8px 14px",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
      }}
    >
      <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", marginBottom: "4px" }}>
        ALERT HISTORY
      </div>
      {alerts.length === 0 && (
        <span style={{ fontSize: "12px", color: "#475569" }}>No alerts yet.</span>
      )}
      {alerts.map((a) => (
        <div key={a.id} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px" }}>
          <StatusBadge label={a.risk_level} />
          <span style={{ color: "#94a3b8" }}>{new Date(a.ts).toLocaleTimeString()}</span>
          <span>{a.message}</span>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
