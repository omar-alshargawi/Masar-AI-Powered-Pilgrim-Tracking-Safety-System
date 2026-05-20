import { theme } from "../theme";

const ROLES = [
  { key: "admin",      label: "Admin" },
  { key: "supervisor", label: "Supervisor" },
  { key: "pilgrim",    label: "Pilgrim" },
];

export default function AuthPills({ value, onChange }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 22 }}>
      {ROLES.map((r) => {
        const active = value === r.key;
        return (
          <button
            key={r.key}
            type="button"
            onClick={() => onChange(r.key)}
            className="btn"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "10px 8px", borderRadius: 999, fontSize: 14, fontWeight: 700,
              cursor: "pointer",
              background: active ? theme.gold : "#fff",
              color: active ? "#fff" : theme.goldDark,
              border: `1.5px solid ${active ? theme.gold : theme.border}`,
              transition: "all 0.2s",
            }}
          >
            <span style={{
              width: 18, height: 18, borderRadius: "50%",
              border: `1.5px solid ${active ? "#fff" : theme.gold}`,
              background: active ? "#fff" : "transparent",
              display: "grid", placeItems: "center",
              color: theme.gold, fontSize: 12, fontWeight: 800,
            }}>
              {active ? "✓" : ""}
            </span>
            {r.label}
          </button>
        );
      })}
    </div>
  );
}
