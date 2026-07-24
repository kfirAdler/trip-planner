import {
  UtensilsCrossed,
  Landmark,
  ShoppingBag,
  TrainFront,
  BedDouble,
  MapPin,
  type LucideIcon,
} from "lucide-react";
import type { Category } from "@/app/generated/prisma/client";

export const CATEGORIES: Category[] = [
  "FOOD",
  "SIGHTSEEING",
  "SHOPPING",
  "TRANSPORT",
  "LODGING",
  "OTHER",
];

// `color` references the CSS var (theme-aware everywhere except it isn't —
// category colors are fixed/non-flipping, see globals.css). `hex` duplicates
// the same literal value for contexts that can't consume a CSS var, like
// ArcGIS marker symbols. Keep both in sync if a category color changes.
export const CATEGORY_META: Record<
  Category,
  { label: string; color: string; hex: string; icon: LucideIcon }
> = {
  FOOD: { label: "Food", color: "var(--cat-food)", hex: "#e0982a", icon: UtensilsCrossed },
  SIGHTSEEING: {
    label: "Sightseeing",
    color: "var(--cat-sightseeing)",
    hex: "#6fa828",
    icon: Landmark,
  },
  SHOPPING: {
    label: "Shopping",
    color: "var(--cat-shopping)",
    hex: "#b0356b",
    icon: ShoppingBag,
  },
  TRANSPORT: {
    label: "Transport",
    color: "var(--cat-transport)",
    hex: "#1e7fb8",
    icon: TrainFront,
  },
  LODGING: { label: "Lodging", color: "var(--cat-lodging)", hex: "#9c6b30", icon: BedDouble },
  OTHER: { label: "Other", color: "var(--cat-other)", hex: "#74777d", icon: MapPin },
};
