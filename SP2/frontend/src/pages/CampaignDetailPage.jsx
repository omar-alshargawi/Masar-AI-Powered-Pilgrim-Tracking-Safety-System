import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { adminApi } from "../services/api";
import { useAuthGuard } from "../hooks/useAuthGuard";
import UserManager from "../components/admin/UserManager";
import AssignmentMatrix from "../components/admin/AssignmentMatrix";
import MasarFooter from "../components/MasarFooter";
import { theme } from "../theme";

export default function CampaignDetailPage() {
  useAuthGuard("admin");
  const { id } = useParams();
  const campaignId = Number(id);
  const navigate = useNavigate();

  const [campaign, setCampaign]       = useState(null);
  const [users, setUsers]             = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [stats, setStats]             = useState(null);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    Promise.all([
      adminApi.getCampaigns(),
      adminApi.getUsers(),
      adminApi.getAssignments(campaignId),
      adminApi.getCampaignStats(campaignId),
    ]).then(([campaigns, allUsers, assigns, campStats]) => {
      setCampaign(campaigns.find((c) => c.id === campaignId) || null);
      setUsers(allUsers);
      setAssignments(assigns);
      setStats(campStats);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [campaignId]);

  if (loading)  return <Centered text="Loading…" />;
  if (!campaign) return <Centered text="Campaign not found" extra={<button onClick={() => navigate("/admin")} style={btnGold}>Go Back</button>} />;

  const supervisors = users.filter((u) => u.role === "supervisor");
  const pilgrims    = users.filter((u) => u.role === "pilgrim");

  return (
    <div className="page-fade" style={pageStyle}>
      {/* Header */}
      <header style={topBar}>
        <button onClick={() => navigate("/admin")} style={backBtn} title="Back">←</button>
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, color: theme.textDark }}>{campaign.name}</h1>
        <span style={{
          marginLeft: 12,
          padding: "5px 14px", borderRadius: 999,
          background: campaign.is_active ? theme.creamSoft : "rgba(100,116,139,0.15)",
          color: campaign.is_active ? theme.goldDark : theme.textMuted,
          fontSize: 12, fontWeight: 800, letterSpacing: 0.5,
        }}>
          {campaign.is_active ? "ACTIVE" : "INACTIVE"}
        </span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={iconBtn}>🔍</span>
          <span style={iconBtn}>🔔</span>
          <span style={{ ...iconBtn, background: theme.gold, color: "#fff" }}>👤</span>
        </div>
      </header>

      <div style={contentWrap}>
        {/* Stats row */}
        <section className="campaign-stats" style={statsRow}>
          <StatCard label="PILGRIMS" value={stats?.total_pilgrims ?? 0} color={theme.goldDark} />
          <StatCard label="ALERTS"   value={stats?.total_alerts   ?? 0} color={theme.danger} />
          <StatCard label="SAFE"     value={stats?.safe           ?? 0} color="#16a34a" />
          <StatCard label="WARNING"  value={stats?.warning        ?? 0} color={theme.warning} />
          <StatCard label="CRITICAL" value={stats?.critical       ?? 0} color={theme.danger} />
        </section>

        {/* Users */}
        <section style={panel}>
          <UserManager users={users} onUsersChange={setUsers} />
        </section>

        {/* User IDs */}
        {pilgrims.length + supervisors.length > 0 && (
          <section style={panel}>
            <div style={panelTitleRow}>
              <h3 style={panelTitle}>USER IDs</h3>
              <span style={panelSub}>— Share with your team</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
              {users.filter((u) => u.role !== "admin").map((u) => (
                <UserIdCard key={u.id} user={u} />
              ))}
            </div>
          </section>
        )}

        {/* Assignment Matrix */}
        <section style={panel}>
          <h3 style={panelTitle}>ASSIGNMENT MATRIX</h3>
          <AssignmentMatrix
            campaignId={campaignId}
            users={users}
            assignments={assignments}
            onAssignmentsChange={setAssignments}
          />
        </section>
      </div>

      <MasarFooter />
    </div>
  );
}

// ── pieces ────────────────────────────────────────────────────────────────────
function StatCard({ label, value, color }) {
  return (
    <div className="fade-up" style={statCardStyle}>
      <div style={{ fontSize: 48, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: theme.textMuted, fontWeight: 700, letterSpacing: 1.5, marginTop: 12 }}>
        {label}
      </div>
    </div>
  );
}

function UserIdCard({ user }) {
  const isSupervisor = user.role === "supervisor";
  return (
    <div style={idCardStyle}>
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: 11, fontWeight: 800, letterSpacing: 1.2,
          color: isSupervisor ? theme.goldDark : theme.textDark,
          textTransform: "uppercase",
        }}>
          {user.role}
        </div>
        <div style={{ fontSize: 14, color: theme.textDark, marginTop: 4 }}>
          {user.display_name}
        </div>
      </div>
      <div style={idBubble}>{user.id}</div>
      <button onClick={() => navigator.clipboard.writeText(String(user.id))} className="btn" style={copyBtn}>
        Copy
      </button>
    </div>
  );
}

function Centered({ text, extra }) {
  return (
    <div style={{ minHeight: "100vh", background: theme.cream, display: "grid", placeItems: "center", gap: 14, color: theme.textDark }}>
      <p>{text}</p>
      {extra}
    </div>
  );
}

// ── styles ────────────────────────────────────────────────────────────────────
const pageStyle = {
  minHeight: "100vh",
  background: theme.cream,
  color: theme.textDark,
  display: "flex", flexDirection: "column",
};
const topBar = {
  display: "flex", alignItems: "center", gap: 14,
  padding: "22px 32px",
  background: theme.cream,
  borderBottom: `1px solid ${theme.border}`,
};
const backBtn = {
  background: "transparent", border: "none", cursor: "pointer",
  fontSize: 22, color: theme.textMuted, padding: "0 8px",
};
const iconBtn = {
  width: 38, height: 38, borderRadius: "50%",
  background: theme.creamSoft, border: `1px solid ${theme.border}`,
  display: "grid", placeItems: "center", cursor: "pointer", fontSize: 16,
};
const contentWrap = {
  padding: "32px",
  display: "flex", flexDirection: "column", gap: 24, flex: 1,
};
const statsRow = {
  display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16,
};
const statCardStyle = {
  background: "#fff", border: `1px solid ${theme.border}`, borderRadius: 16,
  padding: "30px 20px", textAlign: "center",
  boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
};
const panel = {
  background: "#fff", border: `1px solid ${theme.border}`, borderRadius: 16,
  padding: "24px 28px", boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
};
const panelTitleRow = { display: "flex", alignItems: "baseline", gap: 8, marginBottom: 18 };
const panelTitle = {
  margin: 0, color: theme.goldDark,
  fontSize: 16, fontWeight: 800, letterSpacing: 1.5,
};
const panelSub = { color: theme.textMuted, fontSize: 14 };
const idCardStyle = {
  background: "#fff", border: `1px solid ${theme.border}`, borderRadius: 12,
  padding: "12px 14px",
  display: "flex", alignItems: "center", gap: 10,
};
const idBubble = {
  background: theme.creamSoft, borderRadius: 8, minWidth: 44, height: 44,
  display: "grid", placeItems: "center",
  fontSize: 22, fontWeight: 800, color: theme.textDark,
  padding: "0 10px",
};
const copyBtn = {
  background: "transparent", color: theme.goldDark, border: `1.5px solid ${theme.gold}`,
  borderRadius: 8, padding: "6px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer",
};
const btnGold = {
  background: theme.gold, color: "#fff", border: "none",
  padding: "10px 18px", borderRadius: 8, fontWeight: 700, cursor: "pointer",
};
