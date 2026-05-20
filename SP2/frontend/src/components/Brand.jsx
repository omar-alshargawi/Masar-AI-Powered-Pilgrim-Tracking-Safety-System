// Masar Project — official logo. Two variants live in /public:
//   light-logo.png  → brown text on light bg  (use on cream / white surfaces)
//   dark-logo.jpg   → gold text on navy bg    (use on navy footer / dark surfaces)
//
// Prop `light` means "render for a light-text/dark-background context" — i.e. true on navy.
// `size` controls rendered height (width adapts to logo's intrinsic aspect ratio).

export function Brand({ light = false, size = 44 }) {
  const src = light ? "/dark-logo.jpg" : "/light-logo.png";
  return (
    <img
      src={src}
      alt="Masar Project"
      style={{
        height: size,
        width: "auto",
        display: "block",
        objectFit: "contain",
      }}
    />
  );
}

// Logo — icon-focused version. Uses the same image but crops to a square so only the
// Kaaba/M glyph is visible (the wordmark portion is clipped). Useful for tight nav slots.
export function Logo({ size = 44, light = false }) {
  const src = light ? "/dark-logo.jpg" : "/light-logo.png";
  return (
    <div style={{
      width: size,
      height: size,
      overflow: "hidden",
      borderRadius: 6,
      flexShrink: 0,
    }}>
      <img
        src={src}
        alt="Masar Project"
        style={{
          height: size,
          width: "auto",
          objectFit: "cover",
          objectPosition: "left center",
          display: "block",
        }}
      />
    </div>
  );
}
