import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../services/api";
import { theme } from "../theme";
import { Brand } from "../components/Brand";
import AuthPills from "../components/AuthPills";
import MasarFooter from "../components/MasarFooter";

export default function LoginPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState("supervisor");
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const needsId = role !== "admin";
    if (needsId) {
      const n = Number(id);
      if (!n || n < 1) return setError("Enter a valid numeric ID");
    }
    if (!password) return setError("Password is required");

    setLoading(true);
    try {
      const data = await authApi.login({
        role,
        id: needsId ? Number(id) : undefined,
        password,
      });
      localStorage.setItem("sp2_auth", JSON.stringify({ role: data.role, id: data.id }));
      if (data.role === "admin") navigate("/admin");
      else navigate(`/${data.role}/${data.id}`);
    } catch (err) {
      const status = err?.response?.status;
      setError(status === 401 ? "Invalid ID or password" : "Can't reach server. Check your connection.");
    } finally {
      setLoading(false);
    }
  }

  const needsId = role !== "admin";

  return (
    <div className="page-fade" style={pageStyle}>
      <header style={topBar}>
        <Link to="/" style={backLink}>← Back to home</Link>
      </header>

      <div style={cardWrap}>
        <form onSubmit={handleSubmit} className="fade-up masar-auth-card" style={card}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
            <Brand size={52} />
          </div>
          <h1 style={titleStyle}>Sign in</h1>

          <AuthPills value={role} onChange={setRole} />

          {needsId && (
            <>
              <label style={label}>Numeric ID</label>
              <input
                type="number" min="1" value={id}
                onChange={(e) => setId(e.target.value)}
                placeholder="Numeric ID"
                className="field" style={input}
              />
            </>
          )}

          <label style={label}>Password</label>
          <div style={{ position: "relative" }}>
            <input
              type={showPwd ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="field"
              style={{ ...input, paddingRight: 40 }}
            />
            <button type="button" onClick={() => setShowPwd((v) => !v)} style={eyeBtn} aria-label="Toggle password">
              {showPwd ? "🙈" : "👁"}
            </button>
          </div>

          {error && <div style={errorBox}>{error}</div>}

          <button type="submit" disabled={loading} className="btn" style={{ ...primaryBtn, opacity: loading ? 0.7 : 1 }}>
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: theme.textMuted }}>
            Don't have an account? <Link to="/register" style={linkGold}>Register here</Link>
          </div>
        </form>
      </div>

      <MasarFooter />
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh",
  background: `radial-gradient(circle at 50% 0%, #f4dca8 0%, ${theme.creamSoft} 60%, ${theme.cream} 100%)`,
  display: "flex", flexDirection: "column",
};
const topBar = { padding: "20px 32px" };
const backLink = { color: theme.textDark, textDecoration: "none", fontSize: 14, fontWeight: 600 };
const cardWrap = { flex: 1, display: "grid", placeItems: "center", padding: "40px 20px" };
const card = {
  background: "#fff", borderRadius: 24, padding: "44px 40px",
  width: "100%", maxWidth: 480, boxShadow: "0 24px 60px rgba(164,126,68,0.18)",
  display: "flex", flexDirection: "column",
};
const titleStyle = {
  margin: "16px 0 22px", fontSize: 32, fontWeight: 800, color: theme.textDark, textAlign: "center",
};
const label = { fontSize: 13, fontWeight: 800, color: theme.textDark, marginTop: 12, marginBottom: 6 };
const input = {
  background: "#fff", border: `1.5px solid ${theme.gold}`, borderRadius: 10,
  padding: "13px 16px", fontSize: 14, color: theme.textDark, outline: "none",
  width: "100%", boxSizing: "border-box", fontFamily: "inherit",
};
const eyeBtn = {
  position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
  background: "transparent", border: "none", cursor: "pointer", fontSize: 16,
};
const primaryBtn = {
  marginTop: 28, background: theme.gold, color: "#fff", border: "none",
  padding: "15px", borderRadius: 999, fontWeight: 700, fontSize: 16, cursor: "pointer",
};
const errorBox = {
  marginTop: 14, color: theme.danger, background: "rgba(239,68,68,0.1)",
  border: `1px solid ${theme.danger}`, borderRadius: 8, padding: "8px 12px", fontSize: 13,
};
const linkGold = { color: theme.goldDark, textDecoration: "none", fontWeight: 700 };
