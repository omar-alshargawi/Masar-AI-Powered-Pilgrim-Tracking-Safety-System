import StatusBadge from "./StatusBadge";

export default function PilgrimList({ pilgrims, selected, onSelect }) {
  const sorted = [...pilgrims].sort((a, b) => (b.label ?? -1) - (a.label ?? -1));

  return (
    <div style={{ overflowY: "auto", flex: 1 }}>
      {sorted.length === 0 && (
        <p style={{ padding: "12px", color: "#64748b", fontSize: "13px" }}>
          No pilgrims yet. Start the simulation.
        </p>
      )}
      {sorted.map((p) => (
        <div
          key={p.pilgrim_id}
          onClick={() => onSelect(p.pilgrim_id)}
          style={{
            padding: "10px 14px",
            cursor: "pointer",
            borderBottom: "1px solid #1e293b",
            background: selected === p.pilgrim_id ? "#1e293b" : "transparent",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            transition: "background 0.15s",
          }}
        >
          <div>
            <div style={{ fontSize: "13px", fontWeight: 600 }}>{p.pilgrim_id}</div>
            <div style={{ fontSize: "11px", color: "#64748b" }}>
              {p.confidence != null ? `${(p.confidence * 100).toFixed(0)}% conf` : "warming up…"}
            </div>
          </div>
          <StatusBadge label={p.label} />
        </div>
      ))}
    </div>
  );
}
