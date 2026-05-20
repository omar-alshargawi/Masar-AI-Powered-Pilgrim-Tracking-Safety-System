import { useState } from "react";
import { adminApi } from "../../services/api";
import { theme } from "../../theme";

export default function AddUserModal({ onClose, onCreated }) {
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState("pilgrim");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!displayName.trim()) { setError("Name is required"); return; }
    if (!password.trim())    { setError("Password is required"); return; }
    setLoading(true);
    try {
      const user = await adminApi.createUser({ display_name: displayName.trim(), role, password });
      onCreated(user);
      onClose();
    } catch {
      setError("Failed to create user");
      setLoading(false);
    }
  }

  return (
    <div style={backdrop} onClick={onClose}>
      <form onSubmit={handleSubmit} className="fade-up" style={card} onClick={(e) => e.stopPropagation()}>
        <h2 style={titleStyle}>Add User</h2>

        <label style={field}>
          <span style={labelStyle}>Display Name *</span>
          <input
            autoFocus
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g. Ahmed Al-Rashid"
            className="field"
            style={inputStyle}
          />
        </label>

        <label style={field}>
          <span style={labelStyle}>Password *</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Set a login password"
            className="field"
            style={inputStyle}
          />
        </label>

        <label style={field}>
          <span style={labelStyle}>Role</span>
          <select value={role} onChange={(e) => setRole(e.target.value)} className="field" style={inputStyle}>
            <option value="pilgrim">Pilgrim</option>
            <option value="supervisor">Supervisor</option>
          </select>
        </label>

        {error && <p style={errStyle}>{error}</p>}

        <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
          <button type="button" onClick={onClose} className="btn" style={cancelBtn}>Cancel</button>
          <button type="submit" disabled={loading} className="btn" style={{ ...submitBtn, opacity: loading ? 0.7 : 1 }}>
            {loading ? "Adding…" : "Add User"}
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
  padding: 28, width: "100%", maxWidth: 400,
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
const errStyle = {
  color: theme.danger, fontSize: 12, marginTop: 4,
};
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
