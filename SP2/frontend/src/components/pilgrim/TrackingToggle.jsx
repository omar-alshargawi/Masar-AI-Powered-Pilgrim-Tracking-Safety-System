export default function TrackingToggle({ active, onToggle, disabled }) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      style={{
        width: "100%",
        padding: "14px",
        borderRadius: "99px",
        border: "none",
        background: active ? "#ef4444" : "#22c55e",
        color: "#fff",
        fontWeight: 800,
        fontSize: "16px",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "background 0.2s",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
      }}
    >
      <span>{active ? "⏹" : "▶"}</span>
      <span>{active ? "Stop Tracking" : "Start GPS Tracking"}</span>
    </button>
  );
}
