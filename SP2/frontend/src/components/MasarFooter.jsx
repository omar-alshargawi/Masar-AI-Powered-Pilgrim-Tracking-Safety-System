import { Brand } from "./Brand";
import { theme } from "../theme";

export default function MasarFooter() {
  return (
    <>
      <footer className="masar-footer" style={footerStyle}>
        <div style={footerCol}>
          <Brand light />
          <p style={{ color: "#9aa6b5", fontSize: 13, marginTop: 12, maxWidth: 280 }}>
            Masar Project is a trusted platform for Hajj and Umrah pilgrimage supervision services.
          </p>
        </div>
        <Col title="Quick Links" items={["Home", "Features", "About", "Blog"]} />
        <Col title="Services"    items={["Tracking", "SOS", "Analytics", "Support"]} />
        <Col title="Resources"   items={["FAQs", "Contact", "Privacy Policy"]} />
        <div style={footerCol}>
          <div style={ftTitle}>Contact Us</div>
          <div style={ftRow}>📍 Mecca, Saudi Arabia</div>
          <div style={ftRow}>✉️ masar@example.com</div>
          <div style={ftRow}>📞 +966 000 000 000</div>
        </div>
      </footer>
      <div style={copyBar}>© 2026 Masar Project</div>
    </>
  );
}

function Col({ title, items }) {
  return (
    <div style={footerCol}>
      <div style={ftTitle}>{title}</div>
      {items.map((it) => <div key={it} style={{ ...ftRow, cursor: "pointer" }}>{it}</div>)}
    </div>
  );
}

const footerStyle = {
  background: theme.navy, color: "#fff",
  display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr 1.2fr", gap: 32,
  padding: "56px 64px 32px",
};
const footerCol = { display: "flex", flexDirection: "column" };
const ftTitle   = { color: "#fff", fontWeight: 700, fontSize: 15, marginBottom: 12 };
const ftRow     = { color: "#9aa6b5", fontSize: 13, marginBottom: 8 };
const copyBar   = { background: theme.navy, color: "#6b7886", fontSize: 12, padding: "16px 64px", borderTop: "1px solid #1a2b40" };
