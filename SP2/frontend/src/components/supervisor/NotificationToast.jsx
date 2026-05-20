import { useEffect } from "react";

const COLORS = {
  warning:  { bg: "#f97316", border: "#fb923c" },
  critical: { bg: "#ef4444", border: "#f87171" },
  sos:      { bg: "#7c3aed", border: "#a78bfa" },
};

export default function NotificationToast({ notification, onClose }) {
  useEffect(() => {
    if (!notification) return;
    const t = setTimeout(onClose, 6000);
    return () => clearTimeout(t);
  }, [notification, onClose]);

  if (!notification) return null;

  const style = COLORS[notification.kind] || COLORS.warning;

  return (
    <div style={{
      position: "fixed",
      top: "20px",
      right: "20px",
      background: style.bg,
      border: `2px solid ${style.border}`,
      borderRadius: "12px",
      padding: "16px 20px",
      color: "#fff",
      maxWidth: "320px",
      zIndex: 9999,
      boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      animation: "slideIn 0.2s ease-out",
    }}>
      <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "4px" }}>
        {notification.kind === "sos" ? "🆘 SOS Request" :
         notification.kind === "critical" ? "🔴 CRITICAL Alert" : "⚠ WARNING Alert"}
      </div>
      <div style={{ fontSize: "13px", opacity: 0.9 }}>{notification.message}</div>
      <button
        onClick={onClose}
        style={{
          position: "absolute", top: "8px", right: "10px",
          background: "transparent", border: "none", color: "#fff",
          cursor: "pointer", fontSize: "16px", opacity: 0.7,
        }}
      >
        ✕
      </button>
      <style>{`@keyframes slideIn { from { transform: translateX(120%); } to { transform: translateX(0); } }`}</style>
    </div>
  );
}
