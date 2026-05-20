import { useState } from "react";
import { adminApi } from "../../services/api";
import { theme } from "../../theme";

export default function CreateCampaignModal({ onClose, onCreated }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) { setError("Name is required"); return; }
    setLoading(true);
    try {
      const campaign = await adminApi.createCampaign({ name: name.trim(), description: description.trim() });
      onCreated(campaign);
      onClose();
    } catch {
      setError("Failed to create campaign");
      setLoading(false);
    }
  }

  return (
    <div style={backdrop} onClick={onClose}>
      <form onSubmit={handleSubmit} className="fade-up" style={card} onClick={(e) => e.stopPropagation()}>
        <h2 style={titleStyle}>New Campaign</h2>

        <label style={field}>
          <span style={labelStyle}>Campaign Name *</span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Hajj 2026 Group A"
            className="field"
            style={inputStyle}
          />
        </label>

        <label style={field}>
          <span style={labelStyle}>Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Optional description…"
            className="field"
            style={{ ...inputStyle, resize: "vertical", minHeight: 80 }}
          />
        </label>

        {error && <p style={errStyle}>{error}</p>}

        <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
          <button type="button" onClick={onClose} className="btn" style={cancelBtn}>Cancel</button>
          <button type="submit" disabled={loading} className="btn" style={{ ...submitBtn, opacity: loading ? 0.7 : 1 }}>
            {loading ? "Creating…" : "Create Campaign"}
          </button>
        </div>
      </form>
    </div>
  );
}

const backdrop = {
  position: "fixed", inset: 0, background: "rgba(14,29,46,0.55)",
  display: "flex", alignItems: "center", justifyContent: "center",
  zIndex: 1000, padding: 16,
};
const card = {
  background: "#fff", border: `1px solid ${theme.border}`, borderRadius: 16,
  padding: 28, width: "100%", maxWidth: 440,
  boxShadow: "0 24px 60px rgba(164,126,68,0.25)",
  color: theme.textDark,
};
const titleStyle = {
  margin: "0 0 20px", color: theme.goldDark, fontSize: 22, fontWeight: 800,
};
const field = { display: "block", marginBottom: 14 };
const labelStyle = {
  fontSize: 12, fontWeight: 800, color: theme.textDark,
  display: "block", marginBottom: 6,
};
const inputStyle = {
  width: "100%", padding: "11px 14px", borderRadius: 10,
  border: `1.5px solid ${theme.border}`, background: "#fff",
  color: theme.textDark, fontSize: 14, outline: "none",
  boxSizing: "border-box", fontFamily: "inherit",
};
const errStyle = { color: theme.danger, fontSize: 12, marginTop: 4 };
const cancelBtn = {
  flex: 1, padding: "11px", borderRadius: 10,
  border: `1.5px solid ${theme.border}`, background: "transparent",
  color: theme.textDark, cursor: "pointer", fontWeight: 700, fontSize: 14,
};
const submitBtn = {
  flex: 2, padding: "11px", borderRadius: 10,
  border: "none", background: theme.gold,
  color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
};
