import { useNavigate } from "react-router-dom";

export default function CampaignCard({ campaign, onDelete }) {
  const navigate = useNavigate();

  return (
    <div style={{
      background: "#1e293b",
      border: `1px solid ${campaign.is_active ? "#6366f1" : "#334155"}`,
      borderRadius: "12px",
      padding: "20px",
      cursor: "pointer",
      transition: "box-shadow 0.15s",
    }}
      onClick={() => navigate(`/admin/campaigns/${campaign.id}`)}
      onMouseEnter={(e) => e.currentTarget.style.boxShadow = "0 4px 20px #6366f144"}
      onMouseLeave={(e) => e.currentTarget.style.boxShadow = "none"}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <span style={{
            fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "99px",
            background: campaign.is_active ? "#6366f122" : "#33415522",
            color: campaign.is_active ? "#818cf8" : "#64748b",
          }}>
            {campaign.is_active ? "ACTIVE" : "INACTIVE"}
          </span>
          <h3 style={{ color: "#f1f5f9", margin: "8px 0 4px", fontSize: "16px" }}>{campaign.name}</h3>
          <p style={{ color: "#94a3b8", fontSize: "12px", margin: 0 }}>{campaign.description || "No description"}</p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(campaign.id); }}
          style={{
            background: "transparent", border: "none", color: "#ef444480",
            cursor: "pointer", fontSize: "16px", padding: "4px",
          }}
          title="Delete campaign"
        >
          ✕
        </button>
      </div>
      <p style={{ color: "#475569", fontSize: "11px", marginTop: "12px", marginBottom: 0 }}>
        Created {new Date(campaign.created_at).toLocaleDateString()}
      </p>
    </div>
  );
}
