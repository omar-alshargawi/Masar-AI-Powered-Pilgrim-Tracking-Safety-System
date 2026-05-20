import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { pilgrimApi } from "../services/api";
import { useAuthGuard } from "../hooks/useAuthGuard";
import { usePilgrimWs } from "../hooks/usePilgrimWs";
import { useGeolocation } from "../hooks/useGeolocation";
import MiniMap from "../components/pilgrim/MiniMap";
import { Brand } from "../components/Brand";
import { theme } from "../theme";

const LABEL_STYLES = {
  0: { name: "SAFE",     bg: "linear-gradient(135deg,#d4b574 0%,#c89e60 100%)", icon: "🛡️", text: "#1a1a1a" },
  1: { name: "WARNING",  bg: "linear-gradient(135deg,#fb923c 0%,#f97316 100%)", icon: "⚠️", text: "#fff" },
  2: { name: "CRITICAL", bg: "linear-gradient(135deg,#f87171 0%,#ef4444 100%)", icon: "🚨", text: "#fff" },
};

export default function PilgrimPage() {
  useAuthGuard("pilgrim");
  const { id } = useParams();
  const pilgrimId = Number(id);
  const navigate = useNavigate();

  const [status, setStatus]   = useState(null);
  const [tracking, setTracking] = useState(false);
  const [geoError, setGeoError] = useState(null);
  const supervisorIdRef = useRef(null);

  useEffect(() => {
    pilgrimApi.getStatus(pilgrimId).then(setStatus).catch(() => {});
  }, [pilgrimId]);

  const handleStatusUpdate = useCallback((msg) => {
    setStatus((prev) => ({
      ...prev,
      label:       msg.label,
      label_name:  msg.label_name,
      confidence:  msg.confidence,
      pilgrim_lat: msg.pilgrim_lat,
      pilgrim_lon: msg.pilgrim_lon,
    }));
  }, []);

  usePilgrimWs(pilgrimId, { onStatusUpdate: handleStatusUpdate });

  const handleGeoUpdate = useCallback(async (coords) => {
    try {
      await pilgrimApi.postLocation({
        pilgrim_id:      String(pilgrimId),
        supervisor_id:   supervisorIdRef.current ?? "SUP_0",
        pilgrim_lat:     coords.lat,
        pilgrim_lon:     coords.lon,
        pilgrim_speed:   coords.speed || 0,
        pilgrim_heading: coords.heading || 0,
      });
    } catch {}
  }, [pilgrimId]);

  const { position, error: geoErr, supported: geoSupported } = useGeolocation(tracking, handleGeoUpdate);
  useEffect(() => { if (geoErr) setGeoError(geoErr); }, [geoErr]);

  const lat = position?.lat ?? status?.pilgrim_lat;
  const lon = position?.lon ?? status?.pilgrim_lon;

  const label = status?.label ?? 0;
  const conf  = status?.confidence != null ? Math.round(status.confidence * 100) : null;
  const ls    = LABEL_STYLES[label] ?? LABEL_STYLES[0];
  const name  = status?.display_name ?? `Pilgrim #${pilgrimId}`;

  function logout() { localStorage.removeItem("sp2_auth"); navigate("/"); }

  return (
    <div className="page-fade" style={pageWrap}>
      {/* Top gold band */}
      <header style={topBand}>
        <div onClick={logout} style={{ cursor: "pointer", display: "flex", alignItems: "center" }}>
          <Brand size={36} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: theme.navy, fontWeight: 700, fontSize: 14 }}>{name}</span>
          <span style={liveDot(tracking)} />
          <span style={{ color: tracking ? "#16a34a" : "#94a3b8", fontWeight: 700, fontSize: 12 }}>
            {tracking ? "LIVE" : "OFFLINE"}
          </span>
        </div>
      </header>

      <main style={mainCol}>
        {/* Status card */}
        <div className="fade-up" style={{ ...statusCard, background: ls.bg, color: ls.text }}>
          <div style={{ fontSize: 56, lineHeight: 1 }}>{ls.icon}</div>
          <div style={{ fontSize: 44, fontWeight: 800, marginTop: 6, letterSpacing: "-0.5px" }}>{ls.name}</div>
          <div style={{ fontSize: 14, opacity: 0.9, marginTop: 4 }}>
            AI Confidence: {conf != null ? `${conf}%` : "—"}
          </div>
        </div>

        {/* Map */}
        <div className="fade-up" style={mapBox}>
          <MiniMap lat={lat} lon={lon} />
        </div>

        {/* Tracking buttons */}
        {geoSupported ? (
          <div style={trackingRow}>
            <button
              onClick={() => { setTracking(false); setGeoError(null); }}
              className="btn"
              style={{ ...trackBtn, ...(tracking ? trackBtnInactive : trackBtnInactive) }}
              disabled={!tracking}
            >
              Stop Tracking
            </button>
            <button
              onClick={() => { setTracking(true); setGeoError(null); }}
              className="btn"
              style={{ ...trackBtn, ...(tracking ? trackBtnActive : trackBtnPrimary) }}
            >
              Start Tracking
            </button>
          </div>
        ) : (
          <div style={{
            background: "#fef3c7", border: "1px solid #f59e0b", borderRadius: 12,
            padding: "12px 16px", fontSize: 13, color: "#92400e", textAlign: "center",
          }}>
            Geolocation is not supported in this browser.
          </div>
        )}

        {geoError && (
          <p style={{ color: theme.danger, fontSize: 13, textAlign: "center", margin: 0 }}>
            GPS error: {geoError}
          </p>
        )}
        {tracking && position && (
          <p style={{ color: "#16a34a", fontSize: 12, textAlign: "center", margin: 0, fontFamily: "ui-monospace, monospace" }}>
            📍 {position.lat.toFixed(6)}, {position.lon.toFixed(6)}
          </p>
        )}

        {/* SOS */}
        <SosHoldButton pilgrimId={pilgrimId} />
        <p style={{ textAlign: "center", color: theme.textMuted, fontSize: 13, margin: "6px 0 0" }}>
          Hold for 3 seconds to send emergency alert.
        </p>
      </main>

      {/* Bottom nav */}
      <nav style={bottomNav}>
        <NavItem icon="🏠" label="Home" active />
        <NavItem icon="👤" label="Profile" />
        <NavItem icon="⚙️" label="Settings" onClick={logout} />
      </nav>
    </div>
  );
}

// ── SOS button with 3s hold ───────────────────────────────────────────────────
function SosHoldButton({ pilgrimId }) {
  const [progress, setProgress] = useState(0);
  const [sent, setSent] = useState(false);
  const timerRef = useRef(null);
  const startRef = useRef(null);

  function startHold() {
    if (sent) return;
    startRef.current = Date.now();
    timerRef.current = setInterval(async () => {
      const elapsed = Date.now() - startRef.current;
      const pct = Math.min(elapsed / 3000, 1);
      setProgress(pct);
      if (pct >= 1) {
        clearInterval(timerRef.current);
        try { await pilgrimApi.sendHelpRequest(pilgrimId, "SOS — emergency"); } catch {}
        setSent(true);
        setTimeout(() => { setSent(false); setProgress(0); }, 30000);
      }
    }, 50);
  }
  function cancelHold() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!sent) setProgress(0);
  }

  return (
    <button
      className="btn"
      onMouseDown={startHold}
      onMouseUp={cancelHold}
      onMouseLeave={cancelHold}
      onTouchStart={startHold}
      onTouchEnd={cancelHold}
      disabled={sent}
      style={{
        position: "relative", overflow: "hidden",
        background: sent ? "#16a34a" : "#ef4444",
        color: "#fff", border: "none", borderRadius: 999,
        padding: "20px 24px", fontSize: 26, fontWeight: 800,
        cursor: sent ? "default" : "pointer", marginTop: 8,
        boxShadow: "0 10px 30px rgba(239,68,68,0.35)",
      }}
    >
      {/* Progress fill */}
      <div style={{
        position: "absolute", inset: 0,
        background: "rgba(255,255,255,0.25)",
        width: `${progress * 100}%`,
        transition: "width 80ms linear",
      }} />
      <span style={{ position: "relative" }}>
        {sent ? "✓ SOS Sent" : "! S O S"}
      </span>
    </button>
  );
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: "transparent", border: "none", cursor: "pointer",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
      color: active ? theme.goldDark : theme.textMuted, fontWeight: 600, fontSize: 12,
      padding: "8px 14px",
    }}>
      <span style={{ fontSize: 22 }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

const liveDot = (live) => ({
  width: 8, height: 8, borderRadius: "50%",
  background: live ? "#16a34a" : "#94a3b8",
  boxShadow: live ? "0 0 0 4px rgba(22,163,74,0.2)" : "none",
});

// ── styles ────────────────────────────────────────────────────────────────────
const pageWrap = {
  minHeight: "100vh",
  background: theme.cream,
  color: theme.textDark,
  display: "flex", flexDirection: "column",
  paddingBottom: 88, // room for bottom nav
};
const topBand = {
  background: `linear-gradient(135deg, ${theme.goldLight}, ${theme.gold})`,
  padding: "14px 20px",
  display: "flex", alignItems: "center", justifyContent: "space-between",
  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
};
const mainCol = {
  width: "100%", maxWidth: 460, margin: "0 auto",
  padding: "20px 16px",
  display: "flex", flexDirection: "column", gap: 16,
  boxSizing: "border-box",
};
const statusCard = {
  borderRadius: 18, padding: "32px 20px",
  display: "flex", flexDirection: "column", alignItems: "center",
  textAlign: "center",
  boxShadow: "0 12px 30px rgba(200,158,96,0.25)",
};
const mapBox = {
  background: "#e5e7eb", borderRadius: 16, overflow: "hidden",
  height: 220,
};
const trackingRow = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };
const trackBtn = {
  padding: "14px", borderRadius: 999, fontWeight: 700, fontSize: 14,
  cursor: "pointer", transition: "all 0.2s",
};
const trackBtnPrimary = {
  background: theme.gold, color: "#fff", border: `1px solid ${theme.gold}`,
};
const trackBtnActive = {
  background: theme.gold, color: "#fff", border: `1px solid ${theme.gold}`,
};
const trackBtnInactive = {
  background: "transparent", color: theme.goldDark, border: `1.5px solid ${theme.gold}`,
};
const bottomNav = {
  position: "fixed", bottom: 0, left: 0, right: 0,
  background: "#fff", borderTop: `1px solid ${theme.border}`,
  display: "flex", justifyContent: "space-around", alignItems: "center",
  padding: "6px 0", zIndex: 10,
};
