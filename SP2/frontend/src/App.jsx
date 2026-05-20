import { useEffect, useState, useCallback } from "react";
import { api } from "./services/api";
import { createWebSocket } from "./services/ws";
import Map from "./components/Map";
import PilgrimList from "./components/PilgrimList";
import AlertPanel from "./components/AlertPanel";

export default function App() {
  const [pilgrims, setPilgrims] = useState([]);   // map: pilgrim_id → status object
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState({ total: 0, safe: 0, warning: 0, critical: 0 });
  const [selected, setSelected] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);

  // Initial data load
  useEffect(() => {
    api.getPilgrims().then((data) => {
      const map = {};
      data.forEach((p) => { map[p.pilgrim_id] = p; });
      setPilgrims(Object.values(map));
    }).catch(() => {});
    api.getAlerts().then(setAlerts).catch(() => {});
    api.getStats().then(setStats).catch(() => {});
  }, []);

  // WebSocket updates
  const handleWsMessage = useCallback((msg) => {
    if (msg.type === "pilgrim_update") {
      setPilgrims((prev) => {
        const map = {};
        prev.forEach((p) => { map[p.pilgrim_id] = p; });
        map[msg.pilgrim_id] = {
          pilgrim_id:    msg.pilgrim_id,
          supervisor_id: msg.supervisor_id,
          pilgrim_lat:   msg.pilgrim_lat,
          pilgrim_lon:   msg.pilgrim_lon,
          supervisor_lat: msg.supervisor_lat,
          supervisor_lon: msg.supervisor_lon,
          label:         msg.label,
          label_name:    msg.label_name,
          confidence:    msg.confidence,
          last_seen:     msg.timestamp,
        };
        return Object.values(map);
      });

      // Update stats counters
      setStats((prev) => {
        const updated = { ...prev };
        if (msg.label === 0) updated.safe = (updated.safe || 0) + 1;
        if (msg.label === 1) updated.warning = (updated.warning || 0) + 1;
        if (msg.label === 2) updated.critical = (updated.critical || 0) + 1;
        return updated;
      });

      // Append alert if the backend flagged one
      if (msg.alert) {
        setAlerts((prev) => [
          ...prev,
          {
            id: Date.now(),
            pilgrim_id: msg.pilgrim_id,
            risk_level: msg.label,
            message: msg.alert,
            acknowledged: false,
            ts: msg.timestamp,
          },
        ].slice(-200));
      }
    }
  }, []);

  useEffect(() => {
    const socket = createWebSocket((msg) => {
      setWsConnected(true);
      handleWsMessage(msg);
    });
    return () => socket.close();
  }, [handleWsMessage]);

  // Derived stats
  const safeCount     = pilgrims.filter((p) => p.label === 0).length;
  const warningCount  = pilgrims.filter((p) => p.label === 1).length;
  const criticalCount = pilgrims.filter((p) => p.label === 2).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{
        background: "#0f172a",
        borderBottom: "1px solid #1e293b",
        padding: "10px 20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexShrink: 0,
      }}>
        <div>
          <span style={{ fontWeight: 700, fontSize: "16px" }}>Pilgrim Supervision Dashboard</span>
          <span style={{ marginLeft: "12px", fontSize: "11px", color: wsConnected ? "#22c55e" : "#ef4444" }}>
            ● {wsConnected ? "Live" : "Connecting…"}
          </span>
        </div>
        <div style={{ display: "flex", gap: "18px", fontSize: "13px" }}>
          <StatChip label="SAFE"     count={safeCount}     color="#22c55e" />
          <StatChip label="WARNING"  count={warningCount}  color="#f97316" />
          <StatChip label="CRITICAL" count={criticalCount} color="#ef4444" />
          <span style={{ color: "#64748b" }}>{pilgrims.length} pilgrims</span>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Sidebar */}
        <div style={{
          width: "240px",
          flexShrink: 0,
          background: "#0f172a",
          borderRight: "1px solid #1e293b",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}>
          <div style={{ padding: "10px 14px", fontSize: "11px", fontWeight: 700, color: "#64748b" }}>
            PILGRIMS
          </div>
          <PilgrimList pilgrims={pilgrims} selected={selected} onSelect={setSelected} />
        </div>

        {/* Map */}
        <div style={{ flex: 1, position: "relative" }}>
          <Map pilgrims={pilgrims} selected={selected} />
        </div>
      </div>

      {/* ── Alert Panel ────────────────────────────────────────────────────── */}
      <AlertPanel alerts={alerts} />
    </div>
  );
}

function StatChip({ label, count, color }) {
  return (
    <span>
      <span style={{ color, fontWeight: 700 }}>{count}</span>
      <span style={{ color: "#64748b", marginLeft: "4px" }}>{label}</span>
    </span>
  );
}
