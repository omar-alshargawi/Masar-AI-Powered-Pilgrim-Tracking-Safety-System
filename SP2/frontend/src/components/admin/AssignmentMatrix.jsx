import { adminApi } from "../../services/api";
import { theme } from "../../theme";

export default function AssignmentMatrix({ campaignId, users, assignments, onAssignmentsChange }) {
  const supervisors = users.filter((u) => u.role === "supervisor");
  const pilgrims    = users.filter((u) => u.role === "pilgrim");

  function isAssigned(pilgrimId, supervisorId) {
    return assignments.some(
      (a) => a.pilgrim_id === pilgrimId && a.supervisor_id === supervisorId
    );
  }

  async function toggleAssignment(pilgrimId, supervisorId) {
    const existing = assignments.find(
      (a) => a.pilgrim_id === pilgrimId && a.supervisor_id === supervisorId
    );
    if (existing) {
      await adminApi.deleteAssignment(existing.id).catch(() => {});
      onAssignmentsChange((prev) => prev.filter((a) => a.id !== existing.id));
    } else {
      try {
        const a = await adminApi.createAssignment(campaignId, {
          pilgrim_id: pilgrimId,
          supervisor_id: supervisorId,
        });
        onAssignmentsChange((prev) => [...prev, a]);
      } catch (err) {
        console.error("Assignment failed", err);
      }
    }
  }

  if (supervisors.length === 0 || pilgrims.length === 0) {
    return (
      <p style={{ color: theme.textMuted, fontSize: 14, margin: 0 }}>
        Add at least one supervisor and one pilgrim to create assignments.
      </p>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", fontSize: 14, color: theme.textDark, width: "100%" }}>
        <thead>
          <tr>
            <th style={{ ...thStyle, color: theme.textDark }}>Pilgrim \ Supervisor</th>
            {supervisors.map((s) => (
              <th key={s.id} style={thStyle}>
                <div style={{ color: theme.goldDark, fontWeight: 800 }}>{s.display_name}</div>
                <div style={{ color: theme.textMuted, fontWeight: 500, fontSize: 12 }}>#{s.id}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pilgrims.map((p) => (
            <tr key={p.id}>
              <td style={tdStyle}>
                <span style={{ color: theme.goldDark, fontWeight: 700 }}>{p.display_name}</span>{" "}
                <span style={{ color: theme.textMuted, fontSize: 12 }}>#{p.id}</span>
              </td>
              {supervisors.map((s) => {
                const assigned = isAssigned(p.id, s.id);
                return (
                  <td key={s.id} style={{ ...tdStyle, textAlign: "center" }}>
                    <button
                      type="button"
                      onClick={() => toggleAssignment(p.id, s.id)}
                      aria-pressed={assigned}
                      style={{
                        width: 28, height: 28, borderRadius: 6,
                        background: assigned ? theme.gold : "#fff",
                        border: `1.5px solid ${assigned ? theme.gold : theme.border}`,
                        color: "#fff", fontSize: 16, lineHeight: 1,
                        display: "grid", placeItems: "center",
                        cursor: "pointer", transition: "all 0.15s",
                      }}
                    >
                      {assigned ? "✓" : ""}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const thStyle = {
  padding: "10px 16px",
  textAlign: "left",
  borderBottom: `1px solid ${theme.border}`,
  fontWeight: 700,
  fontSize: 14,
  whiteSpace: "nowrap",
};

const tdStyle = {
  padding: "12px 16px",
  borderBottom: `1px solid ${theme.border}`,
  whiteSpace: "nowrap",
};
