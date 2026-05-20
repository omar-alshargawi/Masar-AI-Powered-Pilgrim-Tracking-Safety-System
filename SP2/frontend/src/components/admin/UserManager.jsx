import { useState } from "react";
import { adminApi } from "../../services/api";
import AddUserModal from "./AddUserModal";
import { theme } from "../../theme";

export default function UserManager({ users, onUsersChange }) {
  const [showAdd, setShowAdd] = useState(false);

  const supervisors = users.filter((u) => u.role === "supervisor");
  const pilgrims    = users.filter((u) => u.role === "pilgrim");

  async function handleDelete(id) {
    if (!confirm("Delete this user?")) return;
    await adminApi.deleteUser(id).catch(() => {});
    onUsersChange((prev) => prev.filter((u) => u.id !== id));
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <h3 style={{ margin: 0, color: theme.goldDark, fontSize: 16, fontWeight: 800, letterSpacing: 1.5 }}>
            USERS
          </h3>
          <span style={{ color: theme.textMuted, fontSize: 14 }}>
            — {supervisors.length} supervisor{supervisors.length === 1 ? "" : "s"} · {pilgrims.length} pilgrim{pilgrims.length === 1 ? "" : "s"}
          </span>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn" style={addBtn}>+ Add User</button>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        {users.map((user) => (
          <UserPill key={user.id} user={user} onDelete={() => handleDelete(user.id)} />
        ))}
        {users.length === 0 && (
          <p style={{ color: theme.textMuted, fontSize: 13, margin: 0 }}>
            No users yet. Click "+ Add User" to create supervisors and pilgrims.
          </p>
        )}
      </div>

      {showAdd && (
        <AddUserModal
          onClose={() => setShowAdd(false)}
          onCreated={(u) => onUsersChange((prev) => [...prev, u])}
        />
      )}
    </div>
  );
}

function UserPill({ user, onDelete }) {
  // role tag color: admin = navy, pilgrim = navy, supervisor = gold
  const roleTagStyle = (() => {
    if (user.role === "supervisor") return { bg: theme.creamSoft, text: theme.goldDark };
    return { bg: theme.navy, text: theme.gold };
  })();

  return (
    <div style={{
      background: "#fff", border: `1px solid ${theme.border}`, borderRadius: 12,
      padding: "8px 10px 8px 8px",
      display: "flex", alignItems: "center", gap: 10, fontSize: 14,
    }}>
      <span style={{
        background: roleTagStyle.bg, color: roleTagStyle.text,
        padding: "5px 10px", borderRadius: 8, fontSize: 11, fontWeight: 800,
        letterSpacing: 0.8, textTransform: "uppercase",
      }}>
        {user.role}
      </span>
      <span style={{ color: theme.textDark, fontWeight: 600 }}>{user.display_name}</span>
      <span style={{ color: theme.textMuted, fontSize: 13 }}>#{user.id}</span>
      <button
        onClick={onDelete}
        style={{
          background: "transparent", border: "none", color: theme.textMuted,
          cursor: "pointer", fontSize: 16, lineHeight: 1, padding: "0 6px",
        }}
        title="Remove user"
      >
        ✕
      </button>
    </div>
  );
}

const addBtn = {
  background: theme.gold, color: "#fff", border: "none",
  padding: "10px 18px", borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: "pointer",
};
