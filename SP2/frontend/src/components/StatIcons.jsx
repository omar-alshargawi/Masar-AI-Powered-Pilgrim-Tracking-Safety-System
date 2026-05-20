import { theme } from "../theme";

const baseProps = {
  width: 28, height: 28, viewBox: "0 0 24 24",
  fill: "none", stroke: theme.goldDark, strokeWidth: 1.8,
  strokeLinecap: "round", strokeLinejoin: "round",
};

export function UsersIcon() {
  return (
    <svg {...baseProps}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function ClipboardIcon() {
  return (
    <svg {...baseProps}>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 3h6v3H9z" fill={theme.goldDark} stroke="none" />
      <path d="M9 13l2 2 4-4" />
    </svg>
  );
}

export function HandshakeIcon() {
  return (
    <svg {...baseProps}>
      <path d="M11 17l-3-3 4-4 3 3" />
      <path d="M2 13l5-5 4 4-5 5z" />
      <path d="M22 13l-5-5-4 4 5 5z" />
      <path d="M11 17l3 3 6-6" />
    </svg>
  );
}
