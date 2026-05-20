import { useState } from "react";
import { pilgrimApi } from "../../services/api";

export default function SosButton({ pilgrimId }) {
  const [showModal, setShowModal] = useState(false);
  const [message, setMessage]     = useState("SOS — I need help");
  const [loading, setLoading]     = useState(false);
  const [sent, setSent]           = useState(false);

  async function handleSend() {
    setLoading(true);
    try {
      await pilgrimApi.sendHelpRequest(pilgrimId, message);
      setSent(true);
      setTimeout(() => { setSent(false); setShowModal(false); setMessage("SOS — I need help"); }, 3000);
    } catch {
      alert("Failed to send SOS. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        style={{
          width: "100%",
          padding: "16px",
          borderRadius: "12px",
          border: "2px solid #ef4444",
          background: "#ef4444",
          color: "#fff",
          fontWeight: 900,
          fontSize: "18px",
          cursor: "pointer",
          letterSpacing: "2px",
          boxShadow: "0 4px 20px #ef444466",
        }}
      >
        🆘 SOS
      </button>

      {showModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
        }} onClick={() => !loading && setShowModal(false)}>
          <div
            style={{
              background: "#fff",
              borderRadius: "16px",
              padding: "28px",
              width: "320px",
              color: "#0f172a",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {sent ? (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "48px", marginBottom: "12px" }}>✅</div>
                <h2 style={{ color: "#22c55e" }}>Help Request Sent</h2>
                <p style={{ color: "#64748b", fontSize: "13px" }}>Your supervisor has been notified.</p>
              </div>
            ) : (
              <>
                <h2 style={{ color: "#ef4444", marginBottom: "8px" }}>🆘 Send SOS</h2>
                <p style={{ color: "#64748b", fontSize: "13px", marginBottom: "16px" }}>
                  Your supervisor will be alerted immediately.
                </p>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  style={{
                    width: "100%", padding: "10px", borderRadius: "8px",
                    border: "1px solid #e2e8f0", fontSize: "14px",
                    boxSizing: "border-box", resize: "none", outline: "none",
                  }}
                />
                <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
                  <button
                    onClick={() => setShowModal(false)}
                    style={{
                      flex: 1, padding: "10px", borderRadius: "8px",
                      border: "1px solid #e2e8f0", background: "#fff",
                      color: "#64748b", cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={loading}
                    style={{
                      flex: 2, padding: "10px", borderRadius: "8px",
                      border: "none", background: "#ef4444",
                      color: "#fff", fontWeight: 700, cursor: "pointer",
                    }}
                  >
                    {loading ? "Sending…" : "Send SOS"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
