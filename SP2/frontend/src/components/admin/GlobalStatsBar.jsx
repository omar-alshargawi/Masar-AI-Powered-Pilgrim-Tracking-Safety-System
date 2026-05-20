import { useEffect, useState } from "react";
import { adminApi } from "../../services/api";

export default function GlobalStatsBar() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    adminApi.getGlobalStats().then(setStats).catch(() => {});
    const t = setInterval(() => adminApi.getGlobalStats().then(setStats).catch(() => {}), 10000);
    return () => clearInterval(t);
  }, []);

  if (!stats) return null;

  const items = [
    { label: "Campaigns",   value: stats.total_campaigns,  color: "#6366f1" },
    { label: "Supervisors", value: stats.total_supervisors, color: "#0d9488" },
    { label: "Pilgrims",    value: stats.total_pilgrims,    color: "#f59e0b" },
    { label: "Alerts",      value: stats.total_alerts,      color: "#ef4444" },
  ];

  return (
    <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
      {items.map((item) => (
        <div key={item.label} style={{
          background: "#1e293b",
          borderRadius: "10px",
          padding: "12px 20px",
          display: "flex",
          flexDirection: "column",
          gap: "2px",
          minWidth: "110px",
        }}>
          <span style={{ fontSize: "24px", fontWeight: 800, color: item.color }}>{item.value}</span>
          <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>{item.label.toUpperCase()}</span>
        </div>
      ))}
    </div>
  );
}
