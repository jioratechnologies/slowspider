import { MD3DarkTheme, type MD3Theme } from "react-native-paper";

// Raw brand palette. Kept as the single source of truth; the Material 3 scheme below maps
// these onto real M3 colour roles so Paper components pick them up automatically.
//
// Neutral cool-gray surfaces (not warm/amber-tinted) with a violet primary — enough hue to
// avoid reading as unstyled dark-mode boilerplate, without the amber-everywhere warmth of
// the previous pass.
export const theme = {
  bg: "#0E0F13",
  panel: "#1A1B20",
  panel2: "#26272E",
  ink: "#F2F3F5",
  muted: "#A8ACB8",
  ink3: "#787D8A",
  line: "#26272E",
  lineStrong: "#3C3E48",
  accent: "#9B8CFA",
  accentInk: "#211A4D",
  // Deliberately not sharing hues with `accent`: a priority stripe has to read as its own
  // signal, not blend into whatever color the buttons/FAB happen to be. Red/amber/blue kept
  // as the conventional high/med/low semantics rather than folded into the cooler theme.
  high: "#F2687A",
  med: "#E8A23F",
  low: "#7FB6D9",
  none: "#3C3E48",
  star: "#F2C94C",
  danger: "#F2687A",
};

export const PRIO_COLOR: Record<string, string> = {
  high: theme.high,
  med: theme.med,
  low: theme.low,
  none: theme.none,
};

// Same palette web assigns new clusters from (src/lib/board-helpers.ts) — kept in sync by hand.
export const CLUSTER_COLORS = [
  "#6b7a5e", "#4c9a8a", "#4f8f5a", "#8a9a4e", "#6f8fa6", "#3f8fb0", "#5b6bb0", "#8a6ea6",
  "#a05a86", "#b06f8a", "#c0563f", "#b0574f", "#c17f4a", "#c99a3f", "#b58a3f", "#9a7b53",
  "#7d8891", "#5f7d6a",
];

/**
 * Material 3 dark scheme. The M3 spec layers "surface containers" at increasing elevation
 * rather than using drop shadows, which is why the panel tones map onto the container roles
 * instead of every component picking its own background. Primary is violet, running through
 * FAB/buttons/selected states; secondary is a cool teal reserved for the nav bar's active-pill
 * indicator, so the two color moments read as distinct rather than everything defaulting to
 * the same accent.
 */
export const paperTheme: MD3Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: theme.accent,
    onPrimary: theme.accentInk,
    primaryContainer: "#332F5C",
    onPrimaryContainer: "#E4DFFF",

    secondary: "#8FC9BB",
    onSecondary: "#0B3730",
    secondaryContainer: "#1E4B42",
    onSecondaryContainer: "#B6E5D8",

    tertiary: theme.low,
    onTertiary: "#00304F",
    tertiaryContainer: "#0F3E5C",
    onTertiaryContainer: "#CFE6F7",

    error: theme.danger,
    onError: theme.accentInk,
    errorContainer: "#4A2430",
    onErrorContainer: theme.danger,

    background: theme.bg,
    onBackground: theme.ink,
    surface: theme.bg,
    onSurface: theme.ink,
    surfaceVariant: theme.panel2,
    onSurfaceVariant: theme.muted,
    outline: theme.lineStrong,
    outlineVariant: theme.line,

    elevation: {
      level0: "transparent",
      level1: theme.panel,
      level2: theme.panel,
      level3: theme.panel2,
      level4: theme.panel2,
      level5: theme.panel2,
    },
  },
};
