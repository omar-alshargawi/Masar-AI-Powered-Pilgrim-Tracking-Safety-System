import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../services/api";
import { theme } from "../theme";
import { Brand } from "../components/Brand";
import AuthPills from "../components/AuthPills";
import MasarFooter from "../components/MasarFooter";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState("supervisor");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(null);

  const needsCampaign = role !== "admin";

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!name.trim()) return setError("Full name is required");
    if (password.length < 6) return setError("Password must be at least 6 characters");
    if (password !== confirm) return setError("Passwords don't match");
    if (needsCampaign) {
      const n = Number(campaignId);
      if (!n || n < 1) return setError("Enter a valid Campaign code (numeric)");
    }

    setLoading(true);
    try {
      const data = await authApi.register({
        role,
        display_name: name.trim(),
        password,
        campaign_id: needsCampaign ? Number(campaignId) : undefined,
      });
      setCreated(data);
    } catch (err) {
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail;
      if (status === 404) setError(detail || "Campaign code not found — ask your admin");
      else if (status === 400) setError(detail || "Please check your inputs");
      else setError("Can't reach server. Check your connection.");
    } finally {
      setLoading(false);
    }
  }

  function goToDashboard() {
    localStorage.setItem("sp2_auth", JSON.stringify({ role: created.role, id: created.id }));
    if (created.role === "admin") navigate("/admin");
    else navigate(`/${created.role}/${created.id}`);
  }

  if (created) {
    return (
      <div className="page-fade" style={pageStyle}>
        <header style={topBar}>
          <Link to="/" style={backLink}>← Back to home</Link>
        </header>
        <div style={cardWrap}>
          <div className="fade-up masar-auth-card" style={{ ...card, alignItems: "center", textAlign: "center" }}>
            <div style={checkCircle}>✓</div>
            <h1 style={{ margin: "20px 0 10px", fontSize: 28, fontWeight: 800, color: theme.textDark }}>Account Created</h1>
            <p style={{ color: theme.textMuted, fontSize: 13, margin: "0 0 24px" }}>
              Welcome to Masar Project, {created.display_name}!
            </p>
            <div style={idBlock}>
              <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>
                Your {created.role} ID
              </div>
              <div style={{ fontSize: 56, fontWeight: 800, color: theme.goldDark, fontFamily: "ui-monospace, monospace" }}>
                #{created.id}
              </div>
            </div>
            <p style={{ color: theme.textMuted, fontSize: 13, margin: "20px 0 28px", maxWidth: 320 }}>
              Save this number — you'll need it (with your password) every time you sign in.
            </p>
            <button onClick={goToDashboard} className="btn" style={primaryBtn}>Continue to Dashboard →</button>
          </div>
        </div>
        <MasarFooter />
      </div>
    );
  }

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

          <label style={label}>Full Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full Name" className="field" style={input} />

          <label style={label}>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="field" style={input} />

          <label style={label}>Confirm Password</label>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirm Password" className="field" style={input} />

          {needsCampaign && (
            <>
              <label style={label}>Campaign Code</label>
              <input
                type="number" min="1" value={campaignId} onChange={(e) => setCampaignId(e.target.value)}
                placeholder="Campaign Code"
                className="field"
                style={input}
              />
            </>
          )}

          {error && <div style={errorBox}>{error}</div>}

          <button type="submit" disabled={loading} className="btn" style={{ ...primaryBtn, opacity: loading ? 0.7 : 1 }}>
            {loading ? "Creating…" : "Sign in"}
          </button>

          <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: theme.textMuted }}>
            Already registered? <Link to="/login" style={linkGold}>Sign in</Link>
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
const primaryBtn = {
  marginTop: 28, background: theme.gold, color: "#fff", border: "none",
  padding: "15px", borderRadius: 999, fontWeight: 700, fontSize: 16, cursor: "pointer",
};
const errorBox = {
  marginTop: 14, color: theme.danger, background: "rgba(239,68,68,0.1)",
  border: `1px solid ${theme.danger}`, borderRadius: 8, padding: "8px 12px", fontSize: 13,
};
const linkGold = { color: theme.goldDark, textDecoration: "none", fontWeight: 700 };
const checkCircle = {
  width: 80, height: 80, borderRadius: "50%", background: theme.goldLight,
  color: theme.goldDark, fontSize: 44, display: "grid", placeItems: "center", marginTop: 8,
};
const idBlock = {
  background: theme.creamSoft, borderRadius: 16, padding: "20px 36px",
  border: `1px solid ${theme.border}`, width: "100%", maxWidth: 280,
};
