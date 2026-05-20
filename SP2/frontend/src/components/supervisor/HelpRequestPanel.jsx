import { supervisorApi } from "../../services/api";

export default function HelpRequestPanel({ supervisorId, helpRequests, onAcknowledged }) {
  const unacknowledged = helpRequests.filter((r) => !r.acknowledged);

  async function handleAck(requestId) {
    try {
      await supervisorApi.acknowledgeHelpRequest(supervisorId, requestId);
      onAcknowledged(requestId);
    } catch {
      console.error("Ack failed");
    }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
        <h3 style={{ color: "#94a3b8", fontSize: "11px", fontWeight: 700, margin: 0 }}>SOS REQUESTS</h3>
        {unacknowledged.length > 0 && (
          <span style={{
            background: "#7c3aed", color: "#fff",
            borderRadius: "99px", padding: "1px 8px",
            fontSize: "11px", fontWeight: 700,
          }}>
            {unacknowledged.length}
          </span>
        )}
      </div>

      {helpRequests.length === 0 && (
        <p style={{ color: "#475569", fontSize: "12px" }}>No help requests</p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {helpRequests.map((req) => (
          <div key={req.id} style={{
            background: "#0f172a",
            border: `1px solid ${req.acknowledged ? "#1e293b" : "#7c3aed"}`,
            borderRadius: "8px",
            padding: "12px",
            opacity: req.acknowledged ? 0.5 : 1,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontSize: "13px", color: "#a78bfa" }}>
                🆘 {req.pilgrim_name}
              </span>
              <span style={{ fontSize: "10px", color: "#475569" }}>
                {new Date(req.ts).toLocaleTimeString()}
              </span>
            </div>
            <p style={{ margin: "6px 0", fontSize: "12px", color: "#cbd5e1" }}>{req.message}</p>
            {!req.acknowledged && (
              <button
                onClick={() => handleAck(req.id)}
                style={{
                  background: "#7c3aed", border: "none", color: "#fff",
                  padding: "4px 12px", borderRadius: "6px",
                  fontSize: "11px", fontWeight: 700, cursor: "pointer",
                  marginTop: "4px",
                }}
              >
                Acknowledge
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
