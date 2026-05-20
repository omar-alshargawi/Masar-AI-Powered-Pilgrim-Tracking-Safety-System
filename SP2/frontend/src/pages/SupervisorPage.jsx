import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supervisorApi } from "../services/api";
import { useGeolocation } from "../hooks/useGeolocation";
import { useSupervisorWs } from "../hooks/useSupervisorWs";
import { useAuthGuard } from "../hooks/useAuthGuard";
import SupervisorMap from "../components/supervisor/SupervisorMap";
import NotificationToast from "../components/supervisor/NotificationToast";
import { Brand } from "../components/Brand";
import { theme } from "../theme";

const LABEL_NAME  = { 0: "Safe", 1: "Warning", 2: "Critical" };
const LABEL_COLOR = { 0: "Green", 1: "Orange", 2: "Red" };

export default function SupervisorPage() {
  useAuthGuard("supervisor");
  const { id } = useParams();
  const supervisorId = Number(id);
  const navigate = useNavigate();

  const [pilgrims, setPilgrims]         = useState([]);
  const [alerts, setAlerts]             = useState([]);
  const [helpRequests, setHelpRequests] = useState([]);
  const [toast, setToast]               = useState(null);
  const [selected, setSelected]         = useState(null);
  const [sharing, setSharing]           = useState(false);
  const [myPos, setMyPos]               = useState(null);
  const [search, setSearch]             = useState("");

  // GPS
  const handleGeoUpdate = useCallback(async (coords) => {
    setMyPos(coords);
    try {
      await supervisorApi.shareLocation(supervisorId, {
        lat: coords.lat, lon: coords.lon,
        speed: coords.speed || 0, heading: coords.heading || 0,
      });
    } catch {}
  }, [supervisorId]);

  useGeolocation(sharing, handleGeoUpdate);

  useEffect(() => {
    supervisorApi.getPilgrims(supervisorId).then(setPilgrims).catch(() => {});
    supervisorApi.getAlerts(supervisorId).then(setAlerts).catch(() => {});
    supervisorApi.getHelpRequests(supervisorId).then(setHelpRequests).catch(() => {});
  }, [supervisorId]);

  const handlePilgrimUpdate = useCallback((msg) => {
    const pid = msg.pilgrim_id;
    setPilgrims((prev) => {
      const idx = prev.findIndex((p) => String(p.user_id) === String(pid));
      if (idx === -1) return prev;
      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        pilgrim_lat: msg.pilgrim_lat, pilgrim_lon: msg.pilgrim_lon,
        label: msg.label, label_name: msg.label_name, confidence: msg.confidence,
      };
      return updated;
    });

    if (msg.alert) {
      setAlerts((prev) => [{
        id: Date.now(), pilgrim_id: pid, risk_level: msg.label,
        message: msg.alert, acknowledged: false, ts: msg.timestamp,
      }, ...prev].slice(0, 100));
      setToast({ kind: msg.label === 2 ? "critical" : "warning", message: msg.alert });
    }
  }, []);

  const handleHelpRequest = useCallback((msg) => {
    setHelpRequests((prev) => [{
      id: msg.id, pilgrim_id: msg.pilgrim_id, pilgrim_name: msg.pilgrim_name,
      message: msg.message, acknowledged: false, ts: msg.ts,
    }, ...prev]);
    setToast({ kind: "sos", message: `SOS from ${msg.pilgrim_name}: ${msg.message}` });
  }, []);

  useSupervisorWs(supervisorId, { onPilgrimUpdate: handlePilgrimUpdate, onHelpRequest: handleHelpRequest });

  const filteredPilgrims = useMemo(() => {
    if (!search.trim()) return pilgrims;
    const q = search.toLowerCase();
    return pilgrims.filter((p) => (p.display_name || "").toLowerCase().includes(q) || String(p.user_id).includes(q));
  }, [pilgrims, search]);

  const latestSos = helpRequests.find((r) => !r.acknowledged);

  function logout() { localStorage.removeItem("sp2_auth"); navigate("/"); }

  async function acknowledge(reqId) {
    try { await supervisorApi.acknowledgeHelpRequest(supervisorId, reqId); } catch {}
    setHelpRequests((prev) => prev.map((r) => r.id === reqId ? { ...r, acknowledged: true } : r));
  }

  return (
    <div className="page-fade" style={pageStyle}>
      {/* Top gold band */}
      <header style={topBand}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
          <div onClick={logout} style={{ cursor: "pointer" }}><Brand /></div>
          <div style={{ width: 1, height: 28, background: "rgba(14,29,46,0.2)" }} />
          <span style={{ fontSize: 20, fontWeight: 800, color: theme.textDark }}>Supervisor Center</span>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: theme.goldDark, fontWeight: 800, fontSize: 16 }}>Supervisor #{supervisorId}</div>
          <div style={{ color: theme.textDark, fontSize: 13 }}>Active Pilgrims: {pilgrims.length.toLocaleString()}</div>
        </div>
      </header>

      {/* Action bar */}
      <div style={actionBar}>
        <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontWeight: 700, color: theme.textDark }}>Sharing GPS</span>
          <button
            onClick={() => setSharing((s) => !s)}
            style={{
              width: 56, height: 28, borderRadius: 99,
              background: sharing ? theme.gold : "#d1d5db",
              border: "none", padding: 2, cursor: "pointer",
              display: "flex", alignItems: "center",
              justifyContent: sharing ? "flex-end" : "flex-start",
              transition: "all 0.2s",
            }}
            aria-pressed={sharing}
          >
            <span style={{
              width: 22, height: 22, borderRadius: "50%", background: "#fff",
              fontSize: 10, fontWeight: 800, color: theme.goldDark,
              display: "grid", placeItems: "center",
              boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
            }}>
              {sharing ? "ON" : "OFF"}
            </span>
          </button>
        </label>

        {latestSos && (
          <div style={alertBanner}>
            <span style={{ fontSize: 18 }}>⚠️</span>
            <div>
              <span style={{ fontWeight: 800, color: theme.danger }}>ALERT: </span>
              <span>New SOS Request from {latestSos.pilgrim_name ?? `Pilgrim #${latestSos.pilgrim_id}`}</span>
            </div>
            <button onClick={() => acknowledge(latestSos.id)} className="btn" style={ackBtn}>Acknowledge</button>
          </div>
        )}
      </div>

      {/* Main split */}
      <div className="supervisor-body" style={bodyStyle}>
        {/* Sidebar */}
        <aside className="supervisor-side" style={sideStyle}>
          {/* Pilgrims */}
          <Card title="Pilgrims">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="field"
              style={{ ...inputStyle, marginBottom: 12 }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filteredPilgrims.map((p) => (
                <PilgrimPill key={p.user_id} pilgrim={p} active={selected?.user_id === p.user_id} onClick={() => setSelected(p)} />
              ))}
              {filteredPilgrims.length === 0 && (
                <div style={{ color: theme.textMuted, fontSize: 13, padding: "8px 0" }}>
                  {pilgrims.length === 0 ? "No pilgrims assigned" : "No matches"}
                </div>
              )}
            </div>
          </Card>

          {/* Help Requests */}
          <Card title="Help Requests">
            {helpRequests.length === 0 ? (
              <div style={{ color: theme.textMuted, fontSize: 13 }}>No active requests</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {helpRequests.slice(0, 6).map((r) => (
                  <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, opacity: r.acknowledged ? 0.5 : 1 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: theme.danger, flexShrink: 0 }} />
                    <span style={{ color: theme.textDark }}>
                      SOS: <strong>{r.pilgrim_name ?? `Pilgrim #${r.pilgrim_id}`}</strong>
                      <span style={{ color: theme.textMuted }}> — {timeAgo(r.ts)}</span>
                    </span>
                    <button onClick={() => setSelected({ user_id: r.pilgrim_id })} style={linkBtn}>View Location</button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Recent Alerts */}
          <Card title="Recent Alerts">
            {alerts.length === 0 ? (
              <div style={{ color: theme.textMuted, fontSize: 13 }}>No alerts yet</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflowY: "auto" }}>
                {alerts.slice(0, 20).map((a) => (
                  <div key={a.id} style={alertRow}>
                    <span style={{
                      width: 3, alignSelf: "stretch",
                      background: a.risk_level === 2 ? theme.danger : theme.warning,
                      borderRadius: 2,
                    }} />
                    <div style={{ fontSize: 12 }}>
                      <span style={{ color: theme.textMuted, fontFamily: "ui-monospace, monospace" }}>
                        {fmtTime(a.ts)}
                      </span>
                      <span style={{ color: theme.textDark, marginLeft: 8 }}>{a.message}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </aside>

        {/* Map */}
        <main className="supervisor-map" style={mapWrap}>
          <SupervisorMap
            pilgrims={pilgrims}
            selected={selected}
            supervisorLat={myPos?.lat}
            supervisorLon={myPos?.lon}
          />
        </main>
      </div>

      {/* Stay Updated band */}
      <section style={subscribeSection}>
        <div style={subscribeInner}>
          <div style={envelopeCircle}>✉️</div>
          <h3 style={subscribeTitle}>Stay Updated on Masar Project</h3>
          <p style={subscribeSub}>Receive the latest news, insights, and updates on our pilgrimage services.</p>
          <div style={subscribePill}>
            <input placeholder="Enter email address" style={subscribeInputInner} />
            <button className="btn" style={subscribeBtnInner}>Subscribe</button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="masar-footer" style={footerStyle}>
        <div style={footerCol}>
          <Brand light />
          <p style={{ color: "#9aa6b5", fontSize: 13, marginTop: 12, maxWidth: 280 }}>
            Masar Project is a trusted platform for Hajj and Umrah pilgrimage supervision services.
          </p>
        </div>
        <FooterColumn title="Quick Links" items={["Home", "Features", "About", "Blog"]} />
        <FooterColumn title="Services"   items={["Tracking", "SOS", "Analytics", "Support"]} />
        <FooterColumn title="Resources"  items={["FAQs", "Contact", "Privacy Policy"]} />
        <div style={footerCol}>
          <div style={ftTitle}>Contact Us</div>
          <div style={ftRow}>📍 Mecca, Saudi Arabia</div>
          <div style={ftRow}>✉️ masar@example.com</div>
          <div style={ftRow}>📞 +966 000 000 000</div>
        </div>
      </footer>
      <div style={copyBar}>© 2026 Masar Project</div>

      <NotificationToast notification={toast} onClose={() => setToast(null)} />
    </div>
  );
}

// ── pieces ────────────────────────────────────────────────────────────────────
function Card({ title, children }) {
  return (
    <div className="fade-up" style={cardStyle}>
      <h3 style={cardTitle}>{title}</h3>
      {children}
    </div>
  );
}

function PilgrimPill({ pilgrim, active, onClick }) {
  const label = pilgrim.label ?? 0;
  const palette = label === 2
    ? { bg: "#7c1f24", text: "#fff" }
    : label === 1
    ? { bg: "#f59e0b", text: "#1a1a1a" }
    : { bg: theme.gold, text: "#1a1a1a" };
  return (
    <button
      onClick={onClick}
      style={{
        background: palette.bg, color: palette.text,
        border: active ? `2px solid ${theme.goldDark}` : "none",
        borderRadius: 999, padding: "8px 14px",
        fontSize: 13, fontWeight: 700, cursor: "pointer",
        textAlign: "left", transition: "transform 0.15s, box-shadow 0.2s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateX(2px)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; }}
    >
      {pilgrim.display_name ?? `Pilgrim #${pilgrim.user_id}`} #{pilgrim.user_id} [{LABEL_NAME[label]}, {LABEL_COLOR[label]} Chip]
    </button>
  );
}

function FooterColumn({ title, items }) {
  return (
    <div style={footerCol}>
      <div style={ftTitle}>{title}</div>
      {items.map((it) => <div key={it} style={{ ...ftRow, cursor: "pointer" }}>{it}</div>)}
    </div>
  );
}

function timeAgo(ts) {
  if (!ts) return "Now";
  const s = (Date.now() - new Date(ts).getTime()) / 1000;
  if (s < 60) return "Now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}
function fmtTime(ts) {
  if (!ts) return "--:--:--";
  const d = new Date(ts);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// ── styles ────────────────────────────────────────────────────────────────────
const pageStyle = {
  minHeight: "100vh",
  background: theme.cream,
  color: theme.textDark,
  display: "flex", flexDirection: "column",
};
const topBand = {
  background: `linear-gradient(135deg, ${theme.goldLight} 0%, ${theme.gold} 100%)`,
  padding: "18px 32px",
  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap",
};
const actionBar = {
  background: theme.cream,
  padding: "16px 32px",
  display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
  borderBottom: `1px solid ${theme.border}`,
};
const alertBanner = {
  marginLeft: "auto",
  display: "flex", alignItems: "center", gap: 12,
  background: "#fef3c7", border: `1px solid ${theme.warning}`,
  padding: "10px 16px", borderRadius: 12, fontSize: 13, color: theme.textDark,
  maxWidth: 480,
};
const ackBtn = {
  background: theme.goldDark, color: "#fff", border: "none",
  borderRadius: 999, padding: "6px 12px", fontWeight: 700, fontSize: 12, cursor: "pointer",
};
const bodyStyle = {
  display: "grid", gridTemplateColumns: "340px 1fr", gap: 20,
  padding: "20px 32px", flex: 1,
};
const sideStyle = {
  display: "flex", flexDirection: "column", gap: 16, minWidth: 0,
};
const cardStyle = {
  background: "#fff", borderRadius: 16, padding: "16px 18px",
  border: `1px solid ${theme.border}`, boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
};
const cardTitle = {
  margin: "0 0 12px", fontSize: 16, fontWeight: 800, color: theme.textDark,
};
const inputStyle = {
  width: "100%", padding: "10px 14px", borderRadius: 999,
  border: `1px solid ${theme.border}`, fontSize: 13, outline: "none",
  background: theme.creamSoft, fontFamily: "inherit", boxSizing: "border-box",
};
const linkBtn = {
  marginLeft: "auto", background: "transparent", border: "none",
  color: theme.goldDark, fontWeight: 700, fontSize: 12, cursor: "pointer",
  textDecoration: "underline",
};
const alertRow = { display: "flex", gap: 10, alignItems: "stretch", padding: "4px 0" };
const mapWrap = {
  background: "#fff", borderRadius: 16, overflow: "hidden",
  border: `1px solid ${theme.border}`, minHeight: 540, position: "relative",
};

// Subscribe & footer (same as landing)
const subscribeSection = {
  background: theme.creamSoft,
  backgroundImage: "radial-gradient(circle at 20% 30%, rgba(200,158,96,0.08) 0, transparent 40%), radial-gradient(circle at 80% 70%, rgba(200,158,96,0.08) 0, transparent 40%)",
  padding: "56px 24px",
  display: "flex", justifyContent: "center",
};
const subscribeInner = {
  width: "100%", maxWidth: 640,
  display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 14,
};
const envelopeCircle = {
  width: 60, height: 60, borderRadius: "50%", background: "#fff",
  border: `1px solid ${theme.border}`, display: "grid", placeItems: "center", fontSize: 26,
  boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
};
const subscribeTitle = { fontSize: 26, fontWeight: 800, color: theme.textDark, margin: "8px 0 0" };
const subscribeSub   = { fontSize: 14, color: theme.textMuted, margin: 0, maxWidth: 440, lineHeight: 1.5 };
const subscribePill  = {
  marginTop: 8, display: "flex", alignItems: "center", gap: 4,
  background: "#fff", borderRadius: 999, border: `1px solid ${theme.border}`,
  padding: 4, width: "100%", maxWidth: 460,
};
const subscribeInputInner = {
  flex: 1, border: "none", outline: "none", padding: "10px 18px",
  fontSize: 14, background: "transparent", color: theme.textDark, minWidth: 0, fontFamily: "inherit",
};
const subscribeBtnInner = {
  background: theme.gold, color: "#fff", border: "none", padding: "10px 24px",
  borderRadius: 999, fontWeight: 700, fontSize: 14, flexShrink: 0,
};
const footerStyle = {
  background: theme.navy, color: "#fff",
  display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr 1.2fr", gap: 32,
  padding: "56px 64px 32px",
};
const footerCol = { display: "flex", flexDirection: "column" };
const ftTitle   = { color: "#fff", fontWeight: 700, fontSize: 15, marginBottom: 12 };
const ftRow     = { color: "#9aa6b5", fontSize: 13, marginBottom: 8 };
const copyBar   = { background: theme.navy, color: "#6b7886", fontSize: 12, padding: "16px 64px", borderTop: "1px solid #1a2b40" };
