import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { theme } from "../theme";
import { Brand } from "../components/Brand";
import { UsersIcon, ClipboardIcon, HandshakeIcon } from "../components/StatIcons";

export default function LandingPage() {
  const navigate = useNavigate();
  const [active, setActive] = useState("home");

  // Auto-redirect returning users to their dashboard
  useEffect(() => {
    try {
      const raw = localStorage.getItem("sp2_auth");
      if (!raw) return;
      const { role, id } = JSON.parse(raw);
      if (role === "admin") navigate("/admin", { replace: true });
      else if (role === "supervisor" && id) navigate(`/supervisor/${id}`, { replace: true });
      else if (role === "pilgrim" && id) navigate(`/pilgrim/${id}`, { replace: true });
    } catch {}
  }, [navigate]);

  return (
    <div className="page-fade" style={{ minHeight: "100vh", background: theme.cream, color: theme.textDark, display: "flex", flexDirection: "column" }}>
      {/* Top nav */}
      <header className="masar-nav" style={navStyle}>
        <Brand />
        <nav style={{ display: "flex", gap: "44px", alignItems: "center" }}>
          <a href="#home"     className={`nav-link ${active === "home" ? "active" : ""}`}     onClick={() => setActive("home")}     style={navLink(active === "home")}>Home</a>
          <a href="#features" className={`nav-link ${active === "features" ? "active" : ""}`} onClick={() => setActive("features")} style={navLink(active === "features")}>Features</a>
          <a href="#about"    className={`nav-link ${active === "about" ? "active" : ""}`}    onClick={(e) => { e.preventDefault(); setActive("about"); document.getElementById("features").scrollIntoView({ behavior: "smooth" }); }}    style={navLink(active === "about")}>About Us</a>
          <a href="#contact"  className={`nav-link ${active === "contact" ? "active" : ""}`}  onClick={() => setActive("contact")}  style={navLink(active === "contact")}>Contact</a>
        </nav>
        <Link to="/login" className="btn" style={signInBtn}>Sign In</Link>
      </header>

      {/* Hero — image fills the whole section, gold gradient fades over the left */}
      <section id="home" className="masar-hero" style={heroSection}>
        <div style={heroImageWrap} aria-hidden="true">
          <KaabaImage />
        </div>
        <div className="masar-hero-overlay" style={heroOverlay} aria-hidden="true" />
        <div className="fade-up masar-hero-content" style={heroContent}>
          <h1 className="masar-hero-title" style={heroTitle}>Guiding Your<br/>Sacred Journey.<br/>Masar Project.</h1>
          <p style={heroSub}>
            The trusted platform for Hajj and Umrah pilgrimage supervision and tracking.
          </p>
          <Link to="/register" className="btn" style={ctaBtn}>Explore Our Solutions</Link>
        </div>
      </section>

      {/* Global Impact */}
      <section id="features" className="masar-section" style={{ padding: "72px 64px", background: theme.cream }} aria-label="about">
        <h2 style={sectionTitle}>
          <span style={dash} />
          <span>Global Impact</span>
          <span style={dash} />
        </h2>
        <div className="masar-stats-grid" style={statsGrid}>
          <StatCard delay="fade-up-delay-1" icon={<UsersIcon />}     big="250,000+" label="Total Pilgrims Served"  body="Total pilgrims served across multiple Hajj seasons through our supervision platform." />
          <StatCard delay="fade-up-delay-2" icon={<ClipboardIcon />} big="500+"     label="Successful Campaigns"  body="Completed Hajj and Umrah campaigns running through our pilgrimage system." />
          <StatCard delay="fade-up-delay-3" icon={<HandshakeIcon />} big="100+"     label="Trusted Partners"      body="Trusted partners helping us deliver safe and reliable supervision services." />
        </div>
      </section>

      {/* Subscribe — centered stacked block */}
      <section style={subscribeSection}>
        <div style={subscribeInner} className="fade-up">
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
      <footer id="contact" className="masar-footer" style={footer}>
        <div style={footerCol}>
          <Brand light />
          <p style={{ color: "#9aa6b5", fontSize: 13, marginTop: 12, maxWidth: 280 }}>
            Masar Project is a trusted platform for Hajj and Umrah pilgrimage supervision services.
          </p>
        </div>
        <div style={footerCol}>
          <FooterTitle>Quick Links</FooterTitle>
          <FooterLink>Home</FooterLink>
          <FooterLink>Features</FooterLink>
          <FooterLink>About</FooterLink>
          <FooterLink>Blog</FooterLink>
        </div>
        <div style={footerCol}>
          <FooterTitle>Services</FooterTitle>
          <FooterLink>Tracking</FooterLink>
          <FooterLink>SOS</FooterLink>
          <FooterLink>Analytics</FooterLink>
          <FooterLink>Support</FooterLink>
        </div>
        <div style={footerCol}>
          <FooterTitle>Resources</FooterTitle>
          <FooterLink>FAQs</FooterLink>
          <FooterLink>Contact</FooterLink>
          <FooterLink>Privacy Policy</FooterLink>
        </div>
        <div style={footerCol}>
          <FooterTitle>Contact Us</FooterTitle>
          <div style={footerContactRow}>📍 Mecca, Saudi Arabia</div>
          <div style={footerContactRow}>✉️ masar@example.com</div>
          <div style={footerContactRow}>📞 +966 000 000 000</div>
        </div>
      </footer>
      <div style={copyrightBar}>© 2026 Masar Project</div>
    </div>
  );
}

// ── Kaaba image (real photo if /kaaba.jpg present, fallback to SVG illustration) ──
function KaabaImage() {
  const [src, setSrc] = useState("/kaaba.jpg");
  if (src === null) return <KaabaFallback />;
  return (
    <img
      src={src}
      alt="Kaaba"
      onError={() => setSrc(null)}
      style={{
        width: "100%", height: "100%",objectFit: "cover",
        objectFit: "cover",
        objectPosition: "right 70%",
        display: "block",
      }}
    />
  );
}

function KaabaFallback() {
  // Inline SVG illustration so something visual shows even without a real photo
  return (
    <svg viewBox="0 0 600 400" preserveAspectRatio="xMidYMid slice" style={{ width: "100%", height: "100%", display: "block" }}>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e8d5a8" />
          <stop offset="100%" stopColor="#c89e60" />
        </linearGradient>
        <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d4b574" />
          <stop offset="100%" stopColor="#a47e44" />
        </linearGradient>
      </defs>
      <rect width="600" height="400" fill="url(#sky)" />
      <rect y="280" width="600" height="120" fill="url(#floor)" opacity="0.7" />
      {/* Kaaba cube */}
      <rect x="245" y="160" width="120" height="140" fill="#0e1d2e" />
      <rect x="245" y="195" width="120" height="14" fill="#c89e60" opacity="0.9" />
      {/* Pilgrim dots around it */}
      {Array.from({ length: 38 }).map((_, i) => {
        const angle = (i / 38) * Math.PI * 2;
        const r = 100 + (i % 3) * 18;
        const cx = 305 + Math.cos(angle) * r;
        const cy = 290 + Math.sin(angle) * (r * 0.25);
        return <circle key={i} cx={cx} cy={cy} r="3" fill="#fff" opacity="0.85" />;
      })}
    </svg>
  );
}

// ── pieces ────────────────────────────────────────────────────────────────────
function StatCard({ icon, big, label, body, delay = "" }) {
  return (
    <div className={`fade-up ${delay}`} style={statCard}>
      <div style={{
        width: 56, height: 56, borderRadius: "50%", background: theme.goldLight,
        display: "grid", placeItems: "center", flexShrink: 0,
      }}>{icon}</div>
      <div style={{ fontSize: 38, fontWeight: 800, color: theme.goldDark, marginTop: 20, letterSpacing: "-0.5px" }}>{big}</div>
      <div style={{ fontSize: 16, fontWeight: 700, marginTop: 6, color: theme.textDark }}>{label}</div>
      <div style={{ fontSize: 13, color: theme.textMuted, marginTop: 10, lineHeight: 1.6, maxWidth: 280 }}>{body}</div>
    </div>
  );
}

function FooterTitle({ children }) {
  return <div style={{ color: "#fff", fontWeight: 700, fontSize: 15, marginBottom: 12 }}>{children}</div>;
}
function FooterLink({ children }) {
  return <div style={{ color: "#9aa6b5", fontSize: 13, marginBottom: 8, cursor: "pointer", transition: "color 0.15s" }}
    onMouseEnter={(e) => e.currentTarget.style.color = "#fff"}
    onMouseLeave={(e) => e.currentTarget.style.color = "#9aa6b5"}
  >{children}</div>;
}

// ── styles ────────────────────────────────────────────────────────────────────
const navStyle = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
  padding: "20px 64px", background: theme.cream,
};
const navLink = (active) => ({
  color: active ? theme.goldDark : theme.textDark,
  textDecoration: "none", fontSize: 14, fontWeight: 600,
});
const signInBtn = {
  background: theme.gold, color: "#fff", padding: "10px 28px", borderRadius: 999,
  textDecoration: "none", fontWeight: 700, fontSize: 14, display: "inline-block",
};
const heroSection = {
  position: "relative",
  background: theme.goldLight,
  height: 450, overflow: "hidden",
};
const heroImageWrap = {
  position: "absolute", inset: 0, width: "100%", height: "100%",
};
const heroOverlay = {
  position: "absolute", inset: 0,
  background: `linear-gradient(to right,
    ${theme.goldLight} 0%,
    ${theme.goldLight} 24%,
    rgba(232, 213, 168, 0.65) 40%,
    rgba(232, 213, 168, 0.0) 55%)`,
  pointerEvents: "none",
};
const heroContent = {
  position: "relative",
  padding: "110px 64px 10px 120px",
  maxWidth: 860,
  display: "flex", flexDirection: "column", justifyContent: "center",
  height: 280,
};
const heroTitle = {
  fontSize: 40, fontWeight: 600, lineHeight: 1.05, margin: 0,
  color: theme.textDark, letterSpacing: "-0.5px",
};
const heroSub = {
  fontSize: 20, color: "#2a2a2a",fontWeight: 480, marginTop: 20, maxWidth: 360, lineHeight: 1.55,
};
const ctaBtn = {
  marginTop: 22, alignSelf: "flex-start", background: "#fff", color: theme.textDark,
  padding: "11px 26px", borderRadius: 999, textDecoration: "none", fontWeight: 700, fontSize: 20,
  border: "none", display: "inline-block",
};
const sectionTitle = {
  fontSize: 28, fontWeight: 800, textAlign: "center",
  display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 48,
};
const dash = { width: 40, height: 2, background: theme.gold };
const statsGrid = {
  display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, maxWidth: 1200, margin: "0 auto",
};
const statCard = {
  background: "#fff", border: `1px solid ${theme.border}`, borderRadius: 18,
  padding: "32px 28px", display: "flex", flexDirection: "column", alignItems: "flex-start",
  boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
};
const subscribeSection = {
  background: `${theme.creamSoft}`,
  backgroundImage: "radial-gradient(circle at 20% 30%, rgba(200,158,96,0.08) 0, transparent 40%), radial-gradient(circle at 80% 70%, rgba(200,158,96,0.08) 0, transparent 40%)",
  padding: "56px 24px",
  display: "flex", justifyContent: "center",
};
const subscribeInner = {
  width: "100%", maxWidth: 640,
  display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 14,
};
const envelopeCircle = {
  width: 60, height: 60, borderRadius: "50%",
  background: "#fff", border: `1px solid ${theme.border}`,
  display: "grid", placeItems: "center", fontSize: 26,
  boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
};
const subscribeTitle = {
  fontSize: 26, fontWeight: 800, color: theme.textDark, margin: "8px 0 0",
};
const subscribeSub = {
  fontSize: 14, color: theme.textMuted, margin: 0, maxWidth: 440, lineHeight: 1.5,
};
const subscribePill = {
  marginTop: 8, display: "flex", alignItems: "center", gap: 4,
  background: "#fff", borderRadius: 999, border: `1px solid ${theme.border}`,
  padding: 4, width: "100%", maxWidth: 460,
};
const subscribeInputInner = {
  flex: 1, border: "none", outline: "none", padding: "10px 18px",
  fontSize: 14, background: "transparent", color: theme.textDark, fontFamily: "inherit",
  minWidth: 0,
};
const subscribeBtnInner = {
  background: theme.gold, color: "#fff", border: "none", padding: "10px 24px",
  borderRadius: 999, fontWeight: 700, fontSize: 14, flexShrink: 0,
};
const footer = {
  background: theme.navy, color: theme.textOnNavy,
  display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr 1.2fr", gap: 32,
  padding: "56px 64px 32px",
};
const footerCol = { display: "flex", flexDirection: "column" };
const footerContactRow = { color: "#9aa6b5", fontSize: 13, marginBottom: 8 };
const copyrightBar = {
  background: theme.navy, color: "#6b7886", fontSize: 12,
  padding: "16px 64px", borderTop: "1px solid #1a2b40",
};
