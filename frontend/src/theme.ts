// Design tokens for ABHYUDAYA-CHATURBHUJ. Minimal, Nothing-inspired civic tech:
// stark monochrome base + a single restrained red signal accent. Light only.
//
// Keys match the "color" block of /app/design_guidelines.json. Build sheets with
// makeStyles(); read useTheme().colors for non-style color props.

import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const light = {
  surface: "#FFFFFF",
  onSurface: "#111111",
  surfaceSecondary: "#F7F7F7",
  onSurfaceSecondary: "#111111",
  surfaceTertiary: "#EAEAEA",
  onSurfaceTertiary: "#404040",
  surfaceInverse: "#111111",
  onSurfaceInverse: "#FFFFFF",
  muted: "#737373",

  brand: "#E50000",
  onBrand: "#FFFFFF",
  brandPrimary: "#111111",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#E50000",
  onBrandSecondary: "#FFFFFF",
  brandTertiary: "#FEE2E2",
  onBrandTertiary: "#991B1B",

  success: "#059669",
  onSuccess: "#FFFFFF",
  warning: "#D97706",
  onWarning: "#FFFFFF",
  error: "#E50000",
  onError: "#FFFFFF",
  info: "#404040",
  onInfo: "#FFFFFF",

  border: "#E5E5E5",
  borderStrong: "#111111",
  divider: "#F0F0F0",
};

export type ThemeColors = typeof light;

export const defaultScheme = "light" satisfies ColorScheme;

export const themes: { light: ThemeColors; dark?: ThemeColors } = { light };

export function setColorScheme(scheme: ColorScheme | null) {
  Appearance.setColorScheme?.(scheme);
}

setColorScheme?.(themes.dark ? null : defaultScheme);

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  const scheme: ColorScheme = system && themes[system] ? system : defaultScheme;
  return { scheme, colors: themes[scheme] ?? themes.light };
}

export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 };
export const radius = { sm: 4, md: 8, lg: 12, pill: 999 };
