import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { adminApi } from "../services/api";
import { useAuthGuard } from "../hooks/useAuthGuard";
import CreateCampaignModal from "../components/admin/CreateCampaignModal";
import { Brand } from "../components/Brand";
import { theme } from "../theme";

export default function AdminDashboardPage() {
  useAuthGuard("admin");
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [stats, setStats]         = useState(null);
  const [campaignStats, setCampaignStats] = useState({}); // { campaignId: { total_pilgrims, total_alerts, ... } }
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading]       = useState(true);

  async function loadAll() {
    setLoading(true);
    try {
      const [c, s] = await Promise.all([adminApi.getCampaigns(), adminApi.getGlobalStats()]);
      setCampaigns(c);
      setStats(s);
      const statsArr = await Promise.all(c.map((cc) =>
        adminApi.getCampaignStats(cc.id).then((r) => [cc.id, r]).catch(() => [cc.id, null])
      ));
      const map = {};
      statsArr.forEach(([id, val]) => { if (val) map[id] = val; });
      setCampaignStats(map);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { loadAll(); }, []);

  async function handleDelete(id) {
    if (!confirm("Delete this campaign?")) return;
    await adminApi.deleteCampaign(id).catch(() => {});
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
  }

  function logout() { localStorage.removeItem("sp2_auth"); navigate("/"); }

  // For demo aesthetics, show a friendly fallback count for "Pilgrims Online"
  const activeCount = campaigns.filter((c) => c.is_active).length;
  const totalPilgrims = stats?.total_pilgrims ?? 0;
  const totalAlerts   = stats?.total_alerts   ?? 0;

  return (
    <div className="page-fade admin-shell" style={shell}>
      {/* Sidebar */}
      <aside className="admin-side" style={sideStyle}>
        <div style={sideHeader}>
          <Brand light size={40} />
        </div>
        <nav style={{ display: "flex", flexDirection: "column", padding: "8px 12px", gap: 4 }}>
          <SideItem icon="▦" label="Dashboard" active />
          <SideItem icon="🌐" label="Global Map" />
          <SideItem icon="⚙" label="Settings" onClick={logout} />
        </nav>
      </aside>

      {/* Right column */}
      <div style={rightCol}>
        {/* Top bar */}
        <header style={topBar}>
          <div className="admin-breadcrumb" style={{ fontSize: 22, fontWeight: 800 }}>
            <span style={{ color: theme.goldDark }}>Massar</span>
            <span style={{ color: theme.textMuted, margin: "0 10px" }}>/</span>
            <span style={{ color: theme.textDark }}>Admin Dashboard</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button onClick={() => setShowCreate(true)} className="btn" style={newCampaignBtn}>
              + New Campaign
            </button>
            <div style={bellIcon} title="Notifications">
              🔔
              {totalAlerts > 0 && <span style={bellDot} />}
            </div>
            <button onClick={logout} style={avatarBtn} title="Sign out">
              <span style={{ fontSize: 18 }}>👤</span>
            </button>
          </div>
        </header>

        {/* Stat row */}
        <section className="admin-stats" style={statRow}>
          <StatTile
            label="Active Campaigns"
            value={activeCount}
            sub="Currently running campaigns"
            icon={<TrendIcon />}
          />
          <StatTile
            label="Pilgrims Online"
            value={totalPilgrims.toLocaleString()}
            sub="Real-time active pilgrims"
            icon={<MapIcon />}
          />
          <StatTile
            label="Active Alerts"
            value={totalAlerts}
            sub="Critical alerts requiring attention"
            icon={<WarnIcon />}
            danger={totalAlerts > 0}
          />
        </section>

        {/* Quick Setup banner */}
        {!loading && campaigns.length === 0 && (
          <section style={quickSetupCard} className="fade-up">
            <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: theme.textDark }}>Quick Setup</h3>
            <p style={{ color: theme.textMuted, fontSize: 14, margin: "8px 0 18px", maxWidth: 640, lineHeight: 1.55 }}>
              It looks like you haven't created any campaigns yet. Follow these steps to initiate your pilgrim
              tracking campaign and deploy assets to the field.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <button onClick={() => setShowCreate(true)} className="btn" style={firstCampaignBtn}>
                Create First Campaign
              </button>
              <a href="#guide" style={{ color: theme.goldDark, fontWeight: 700, fontSize: 14, textDecoration: "underline" }}>
                Guide &amp; Setup Reference ↗
              </a>
            </div>
          </section>
        )}

        {/* Campaign grid */}
        <section style={{ padding: "0 28px 32px" }}>
          {loading ? (
            <p style={{ color: theme.textMuted, padding: "12px 0" }}>Loading…</p>
          ) : campaigns.length === 0 ? null : (
            <div className="admin-campaigns" style={campaignGrid}>
              {campaigns.map((c) => (
                <CampaignTile
                  key={c.id}
                  campaign={c}
                  stats={campaignStats[c.id]}
                  onOpen={() => navigate(`/admin/campaigns/${c.id}`)}
                  onDelete={() => handleDelete(c.id)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="masar-footer" style={footerStyle}>
          <div style={footerCol}>
            <Brand light />
            <p style={{ color: "#9aa6b5", fontSize: 13, marginTop: 12, maxWidth: 280 }}>
              Masar Project is a trusted platform for Hajj and Umrah pilgrimage supervision services.
            </p>
          </div>
          <FtCol title="Quick Links" items={["Home", "Features", "About", "Blog"]} />
          <FtCol title="Services"   items={["Tracking", "SOS", "Analytics", "Support"]} />
          <FtCol title="Resources"  items={["FAQs", "Contact", "Privacy Policy"]} />
          <div style={footerCol}>
            <div style={ftTitle}>Contact Us</div>
            <div style={ftRow}>📍 Mecca, Saudi Arabia</div>
            <div style={ftRow}>✉️ masar@example.com</div>
            <div style={ftRow}>📞 +966 000 000 000</div>
          </div>
        </footer>
        <div style={copyBar}>© 2026 Masar Project</div>
      </div>

      {showCreate && (
        <CreateCampaignModal
          onClose={() => setShowCreate(false)}
          onCreated={(c) => { setCampaigns((prev) => [c, ...prev]); loadAll(); }}
        />
      )}
    </div>
  );
}

// ── Sidebar item ─────────────────────────────────────────────────────────────
function SideItem({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "12px 14px", borderRadius: 10,
      background: active ? "#1a2b40" : "transparent",
      border: active ? `1px solid ${theme.gold}66` : "1px solid transparent",
      color: active ? theme.cream : "#9aa6b5",
      cursor: "pointer", fontWeight: 700, fontSize: 14, textAlign: "left",
      width: "100%", transition: "all 0.2s",
    }}
    onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "#162338"; }}
    onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}>
      <span style={{ fontSize: 16, color: active ? theme.gold : "#9aa6b5" }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

// ── Stat tile ────────────────────────────────────────────────────────────────
function StatTile({ label, value, sub, icon, danger }) {
  return (
    <div className="fade-up" style={statTile}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ fontSize: 13, color: theme.textMuted, fontWeight: 700 }}>{label}</div>
        <div style={{
          width: 34, height: 34, borderRadius: 8,
          background: danger ? "#fef3c7" : theme.creamSoft,
          color: danger ? theme.warning : theme.goldDark,
          display: "grid", placeItems: "center",
        }}>{icon}</div>
      </div>
      <div style={{ fontSize: 38, fontWeight: 800, color: danger ? theme.danger : theme.textDark, marginTop: 4, letterSpacing: "-0.5px" }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 4 }}>{sub}</div>
    </div>
  );
}

// ── Campaign tile ─────────────────────────────────────────────────────────────
function CampaignTile({ campaign, stats, onOpen, onDelete }) {
  return (
    <div className="fade-up" style={campaignTile} onClick={onOpen}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: theme.textDark, paddingRight: 12 }}>
          {campaign.name}
        </h3>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          style={{
            background: "transparent", border: "none", color: theme.textMuted,
            cursor: "pointer", fontSize: 16, padding: 4,
          }}
          title="Delete"
        >
          🗑
        </button>
      </div>
      <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        <Row label="Status"      value={
          <span style={{
            background: campaign.is_active ? "rgba(34,197,94,0.15)" : "rgba(100,116,139,0.15)",
            color: campaign.is_active ? "#16a34a" : theme.textMuted,
            padding: "3px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700,
          }}>{campaign.is_active ? "Active" : "Inactive"}</span>
        } />
        <Row label="Pilgrims"    value={stats?.total_pilgrims ?? "—"} bold />
        <Row label="Supervisors" value={stats?.total_supervisors ?? "—"} bold />
        <Row label="Alerts"      value={stats?.total_alerts ?? "—"} bold />
      </div>
    </div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ color: theme.textMuted, fontSize: 14 }}>{label}</span>
      <span style={{ color: theme.textDark, fontSize: bold ? 18 : 14, fontWeight: bold ? 800 : 600 }}>{value}</span>
    </div>
  );
}

function FtCol({ title, items }) {
  return (
    <div style={footerCol}>
      <div style={ftTitle}>{title}</div>
      {items.map((it) => <div key={it} style={{ ...ftRow, cursor: "pointer" }}>{it}</div>)}
    </div>
  );
}

// ── Icons ────────────────────────────────────────────────────────────────────
const iconProps = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
function TrendIcon() { return <svg {...iconProps}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>; }
function MapIcon()   { return <svg {...iconProps}><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" /><line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" /></svg>; }
function WarnIcon()  { return <svg {...iconProps}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>; }

// ── Styles ───────────────────────────────────────────────────────────────────
const shell = {
  minHeight: "100vh",
  display: "grid",
  gridTemplateColumns: "240px 1fr",
  background: theme.cream,
  color: theme.textDark,
};
const sideStyle = {
  background: theme.navy,
  color: theme.cream,
  display: "flex", flexDirection: "column",
  borderRight: "1px solid #1a2b40",
  position: "sticky", top: 0, height: "100vh",
};
const sideHeader = {
  padding: "20px 18px",
  display: "flex", alignItems: "center", gap: 12,
  borderBottom: "1px solid #1a2b40",
};
const rightCol = { display: "flex", flexDirection: "column", minWidth: 0 };
const topBar = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
  padding: "20px 28px",
  background: theme.cream,
  borderBottom: `1px solid ${theme.border}`,
};
const newCampaignBtn = {
  background: theme.gold, color: "#fff", border: "none",
  padding: "10px 18px", borderRadius: 8, fontWeight: 700, fontSize: 14,
};
const bellIcon = {
  position: "relative",
  width: 38, height: 38, borderRadius: "50%",
  background: theme.creamSoft, display: "grid", placeItems: "center",
  fontSize: 18, cursor: "pointer", border: `1px solid ${theme.border}`,
};
const bellDot = {
  position: "absolute", top: 6, right: 6,
  width: 9, height: 9, borderRadius: "50%", background: theme.danger,
  border: "2px solid #fff",
};
const avatarBtn = {
  width: 38, height: 38, borderRadius: "50%",
  background: theme.creamSoft, border: `1px solid ${theme.border}`,
  display: "grid", placeItems: "center", cursor: "pointer",
};
const statRow = {
  display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16,
  padding: "24px 28px 0",
};
const statTile = {
  background: "#fff", border: `1px solid ${theme.border}`, borderRadius: 14,
  padding: "18px 20px", boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
};
const quickSetupCard = {
  margin: "24px 28px 8px",
  background: "#fff", border: `1px solid ${theme.border}`, borderRadius: 16,
  padding: "26px 28px", boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
};
const firstCampaignBtn = {
  background: theme.gold, color: "#fff", border: "none",
  padding: "10px 22px", borderRadius: 8, fontWeight: 700, fontSize: 14,
};
const campaignGrid = {
  display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 18,
  marginTop: 24,
};
const campaignTile = {
  background: "#fff", border: `1px solid ${theme.gold}66`, borderRadius: 16,
  padding: "20px 22px", cursor: "pointer",
  transition: "transform 0.15s, box-shadow 0.2s",
  boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
};
const footerStyle = {
  background: theme.navy, color: "#fff",
  display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr 1.2fr", gap: 32,
  padding: "56px 64px 32px", marginTop: "auto",
};
const footerCol = { display: "flex", flexDirection: "column" };
const ftTitle   = { color: "#fff", fontWeight: 700, fontSize: 15, marginBottom: 12 };
const ftRow     = { color: "#9aa6b5", fontSize: 13, marginBottom: 8 };
const copyBar   = { background: theme.navy, color: "#6b7886", fontSize: 12, padding: "16px 64px", borderTop: "1px solid #1a2b40" };
