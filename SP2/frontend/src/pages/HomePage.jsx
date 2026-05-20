import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../services/api";

const ROLES = [
  {
    key: "admin",
    label: "Admin",
    icon: "⚙",
    desc: "Manage campaigns, users and assignments",
    color: "#6366f1",
    path: "/admin",
    noId: true,
  },
  {
    key: "supervisor",
    label: "Supervisor",
    icon: "👁",
    desc: "Monitor assigned pilgrims in real time",
    color: "#0d9488",
    path: "/supervisor",
  },
  {
    key: "pilgrim",
    label: "Pilgrim",
    icon: "🧭",
    desc: "Activate GPS tracking and send SOS",
    color: "#f59e0b",
    path: "/pilgrim",
  },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [modal, setModal] = useState(null);
  const [idInput, setIdInput] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleCardClick(role) {
    setModal(role);
    setIdInput("");
    setPassword("");
    setError("");
  }

  async function handleLogin() {
    if (!modal.noId) {
      const id = idInput.trim();
      if (!id || isNaN(Number(id)) || Number(id) < 1) {
        setError("Enter a valid numeric ID");
        return;
      }
    }
    if (!password) {
      setError("Password is required");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const data = await authApi.login({
        role: modal.key,
        id: modal.noId ? undefined : Number(idInput.trim()),
        password,
      });
      localStorage.setItem("sp2_auth", JSON.stringify({ role: data.role, id: data.id }));
      if (modal.noId) {
        navigate(modal.path);
      } else {
        navigate(`${modal.path}/${data.id}`);
      }
      setModal(null);
    } catch (err) {
      const status = err?.response?.status;
      setError(status === 401 ? "Invalid ID or password" : "Login failed — is the server running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
    }}>
      <h1 style={{ color: "#f1f5f9", fontSize: "28px", fontWeight: 800, marginBottom: "8px" }}>
        Pilgrim Supervision AI
      </h1>
      <p style={{ color: "#94a3b8", marginBottom: "48px", fontSize: "14px" }}>
        Select your role to continue
      </p>

      <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", justifyContent: "center" }}>
        {ROLES.map((role) => (
          <button
            key={role.key}
            onClick={() => handleCardClick(role)}
            style={{
              background: "#1e293b",
              border: `2px solid ${role.color}`,
              borderRadius: "16px",
              padding: "36px 40px",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px",
              width: "200px",
              transition: "transform 0.15s, box-shadow 0.15s",
              color: "#f1f5f9",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-4px)";
              e.currentTarget.style.boxShadow = `0 12px 32px ${role.color}44`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <span style={{ fontSize: "40px" }}>{role.icon}</span>
            <span style={{ fontWeight: 700, fontSize: "18px", color: role.color }}>{role.label}</span>
            <span style={{ color: "#94a3b8", fontSize: "12px", textAlign: "center" }}>{role.desc}</span>
          </button>
        ))}
      </div>

      {/* Login modal */}
      {modal && (
        <div style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.6)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000,
        }} onClick={() => setModal(null)}>
          <div
            style={{
              background: "#1e293b",
              border: `2px solid ${modal.color}`,
              borderRadius: "12px",
              padding: "32px",
              width: "320px",
              color: "#f1f5f9",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginBottom: "4px", color: modal.color }}>{modal.label} Login</h2>
            <p style={{ color: "#94a3b8", fontSize: "13px", marginBottom: "20px" }}>
              {modal.noId ? "Enter your admin password" : `Enter your ${modal.label.toLowerCase()} ID and password`}
            </p>

            {!modal.noId && (
              <input
                autoFocus
                type="number"
                min="1"
                value={idInput}
                onChange={(e) => setIdInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                placeholder="Your numeric ID"
                style={inputStyle(error && !idInput)}
              />
            )}

            <input
              autoFocus={modal.noId}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="Password"
              style={{ ...inputStyle(false), marginTop: modal.noId ? 0 : "10px" }}
            />

            {error && <p style={{ color: "#ef4444", fontSize: "12px", marginTop: "8px" }}>{error}</p>}

            <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
              <button
                onClick={() => setModal(null)}
                style={{
                  flex: 1, padding: "10px", borderRadius: "8px",
                  border: "1px solid #334155", background: "transparent",
                  color: "#94a3b8", cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleLogin}
                disabled={loading}
                style={{
                  flex: 1, padding: "10px", borderRadius: "8px",
                  border: "none", background: modal.color,
                  color: "#fff", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? "…" : "Login"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function inputStyle(hasError) {
  return {
    width: "100%",
    padding: "10px 14px",
    borderRadius: "8px",
    border: `1px solid ${hasError ? "#ef4444" : "#334155"}`,
    background: "#0f172a",
    color: "#f1f5f9",
    fontSize: "16px",
    boxSizing: "border-box",
    outline: "none",
    display: "block",
  };
}
