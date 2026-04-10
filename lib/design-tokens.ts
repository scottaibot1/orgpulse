// lib/design-tokens.ts
// SINGLE SOURCE OF TRUTH for all colors, spacing, typography in OrgRise emails and PDFs.
// To change a color anywhere in the app, change it ONCE here.

export type Theme = "dark" | "light";

export interface DesignTokens {
  // ── Page-level backgrounds (outermost) ──
  pageBodyBg: string;       // The body background behind the email card
  pageBg: string;           // The email card background

  // ── Section backgrounds ──
  sectionBg: string;        // Section card background (Needs Attention, person cards)
  sectionBgAlt: string;     // Subtle alternate (time bars, pipeline tiles)
  sectionRailBg: string;    // Tinted rail wrapping sections to create depth

  // ── Header accents (the "premium" navy + indigo treatment) ──
  headerBg: string;         // Top header bar of email
  headerText: string;       // Text on header bar
  headerSubtext: string;    // Subtitle text on header bar

  accentPrimary: string;    // PRIMARY accent — used for dept bars, person card headers, CTAs
  accentPrimaryBg: string;  // Background tint for accent areas
  accentPrimaryBorder: string; // Border on accent areas
  accentPrimaryText: string;   // Text on accent backgrounds

  // ── Text colors ──
  textPrimary: string;      // Body text — must be high contrast
  textSecondary: string;    // Slightly muted body text
  textTertiary: string;     // Labels, metadata
  textMuted: string;        // Lowest priority text
  textInverse: string;      // Text on dark backgrounds (always near-white)

  // ── Status colors ──
  textOverdue: string;      // BOLD RED for "was due"
  textUrgent: string;       // BOLD AMBER for due-soon
  textSuccess: string;
  textWarning: string;
  textDanger: string;

  // ── Status backgrounds ──
  bgOverdue: string;        // Background tint for overdue items
  bgSuccess: string;        // Notable progress green section
  bgWarning: string;
  bgDanger: string;
  borderSuccess: string;

  // ── Borders ──
  border: string;           // Default border
  borderStrong: string;     // Stronger border for emphasis

  // ── Bar chart colors (time allocation) ──
  bar1: string;
  bar2: string;
  bar3: string;
  bar4: string;
  bar5: string;
  bar6: string;

  // ── CTA button ──
  buttonBg: string;
  buttonText: string;

  // ── Layout ──
  radiusLg: string;
  radiusMd: string;
  radiusSm: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// DARK MODE TOKENS
// ═══════════════════════════════════════════════════════════════════════════
export const DARK: DesignTokens = {
  pageBodyBg:    "#0f172a",
  pageBg:        "#0f172a",

  sectionBg:     "#1e293b",
  sectionBgAlt:  "#0f172a",
  sectionRailBg: "#1e293b",

  headerBg:      "#1e293b",
  headerText:    "#ffffff",
  headerSubtext: "rgba(255,255,255,0.6)",

  accentPrimary:       "#6366f1",  // Indigo — same as the View Full Report button
  accentPrimaryBg:     "#1e1b4b",  // Deep indigo background
  accentPrimaryBorder: "#6366f1",  // Bright indigo border
  accentPrimaryText:   "#c7d2fe",  // Light indigo text

  textPrimary:   "#f1f5f9",
  textSecondary: "#cbd5e1",
  textTertiary:  "#94a3b8",
  textMuted:     "#64748b",
  textInverse:   "#ffffff",

  textOverdue:   "#fca5a5",  // Bright red — readable on dark
  textUrgent:    "#fcd34d",  // Bright amber
  textSuccess:   "#86efac",
  textWarning:   "#fcd34d",
  textDanger:    "#fca5a5",

  bgOverdue:     "#7f1d1d",
  bgSuccess:     "#0d2818",
  bgWarning:     "#78350f",
  bgDanger:      "#7f1d1d",
  borderSuccess: "#166534",

  border:        "rgba(255,255,255,0.10)",
  borderStrong:  "rgba(255,255,255,0.20)",

  bar1: "#6366f1",
  bar2: "#10b981",
  bar3: "#f59e0b",
  bar4: "#8b5cf6",
  bar5: "#94a3b8",
  bar6: "#ec4899",

  buttonBg:   "#6366f1",
  buttonText: "#ffffff",

  radiusLg: "12px",
  radiusMd: "8px",
  radiusSm: "4px",
};

// ═══════════════════════════════════════════════════════════════════════════
// LIGHT MODE TOKENS
// ═══════════════════════════════════════════════════════════════════════════
export const LIGHT: DesignTokens = {
  pageBodyBg:    "#eef2f7",  // Cool blue-gray page background
  pageBg:        "#ffffff",  // White email card

  sectionBg:     "#ffffff",
  sectionBgAlt:  "#f1f5f9",
  sectionRailBg: "#f1f5f9",

  headerBg:      "#1e293b",  // Dark navy header on light email — premium contrast
  headerText:    "#ffffff",
  headerSubtext: "rgba(255,255,255,0.75)",

  accentPrimary:       "#6366f1",  // SAME indigo as dark mode — brand consistency
  accentPrimaryBg:     "#eef2ff",  // Pale indigo background
  accentPrimaryBorder: "#6366f1",  // Bright indigo border
  accentPrimaryText:   "#4338ca",  // Deep indigo text

  textPrimary:   "#0f172a",  // Near-black, strong contrast
  textSecondary: "#334155",  // Mid slate
  textTertiary:  "#64748b",
  textMuted:     "#94a3b8",
  textInverse:   "#ffffff",

  textOverdue:   "#dc2626",  // Strong red for white background
  textUrgent:    "#d97706",  // Burnt amber
  textSuccess:   "#15803d",
  textWarning:   "#b45309",
  textDanger:    "#b91c1c",

  bgOverdue:     "#fee2e2",
  bgSuccess:     "#ecfdf5",
  bgWarning:     "#fef3c7",
  bgDanger:      "#fee2e2",
  borderSuccess: "#86efac",

  border:        "#cbd5e1",
  borderStrong:  "#94a3b8",

  bar1: "#4338ca",
  bar2: "#059669",
  bar3: "#d97706",
  bar4: "#7c3aed",
  bar5: "#475569",
  bar6: "#db2777",

  buttonBg:   "#4338ca",
  buttonText: "#ffffff",

  radiusLg: "12px",
  radiusMd: "8px",
  radiusSm: "4px",
};

export function getTokens(theme: Theme = "dark"): DesignTokens {
  return theme === "light" ? LIGHT : DARK;
}
