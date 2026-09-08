// Civic domain constants shared across the app.
import {
  Buildings,
  DotsThreeOutline,
  Drop,
  Factory,
  Lightbulb,
  TrafficSign,
  Trash,
  Warning,
  Waves,
  type IconProps,
} from "phosphor-react-native";
import type { ComponentType } from "react";

import type { ThemeColors } from "@/src/theme";

export const CATEGORIES = [
  "Pothole / Road Damage",
  "Garbage / Waste",
  "Broken Streetlight",
  "Water Leakage",
  "Drainage / Sewage",
  "Traffic / Road Obstruction",
  "Pollution",
  "Damaged Public Infrastructure",
  "Other",
] as const;

export const SEVERITIES = ["Low", "Medium", "High", "Critical"] as const;
export const STATUSES = ["Reported", "Verified", "In Progress", "Resolved"] as const;
export const CONTRIBUTOR_TYPES = [
  "Citizen",
  "Student",
  "University",
  "Faculty",
  "Community Member",
  "Expert",
] as const;

const CATEGORY_ICONS: Record<string, ComponentType<IconProps>> = {
  "Pothole / Road Damage": Warning,
  "Garbage / Waste": Trash,
  "Broken Streetlight": Lightbulb,
  "Water Leakage": Drop,
  "Drainage / Sewage": Waves,
  "Traffic / Road Obstruction": TrafficSign,
  Pollution: Factory,
  "Damaged Public Infrastructure": Buildings,
  Other: DotsThreeOutline,
};

export function categoryIcon(category: string): ComponentType<IconProps> {
  return CATEGORY_ICONS[category] ?? DotsThreeOutline;
}

// Short label for compact chips
export function shortCategory(category: string): string {
  const map: Record<string, string> = {
    "Pothole / Road Damage": "Road",
    "Garbage / Waste": "Garbage",
    "Broken Streetlight": "Streetlight",
    "Water Leakage": "Water",
    "Drainage / Sewage": "Drainage",
    "Traffic / Road Obstruction": "Traffic",
    Pollution: "Pollution",
    "Damaged Public Infrastructure": "Infra",
    Other: "Other",
  };
  return map[category] ?? category;
}

export function severityColor(severity: string, c: ThemeColors): string {
  switch (severity) {
    case "Low":
      return c.success;
    case "Medium":
      return c.warning;
    case "High":
      return c.error;
    case "Critical":
      return c.onSurface;
    default:
      return c.muted;
  }
}

export function statusColor(status: string, c: ThemeColors): string {
  switch (status) {
    case "Reported":
      return c.muted;
    case "Verified":
      return c.info;
    case "In Progress":
      return c.warning;
    case "Resolved":
      return c.success;
    default:
      return c.muted;
  }
}

export function priorityColor(label: string, c: ThemeColors): string {
  switch (label) {
    case "Critical":
      return c.error;
    case "High Priority":
      return c.warning;
    case "Medium Priority":
      return c.info;
    default:
      return c.muted;
  }
}
