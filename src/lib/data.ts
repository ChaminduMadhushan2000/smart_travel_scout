// ---------------------------------------------------------------------------
// TravelPackage — the core domain type for every inventory item.
// This is the single source of truth; the API route and UI both import it.
// ---------------------------------------------------------------------------

/** Allowed tag values across the inventory — keeps tag usage type-safe. */
export type PackageTag =
  | "cold"
  | "nature"
  | "hiking"
  | "history"
  | "culture"
  | "walking"
  | "animals"
  | "adventure"
  | "photography"
  | "beach"
  | "surfing"
  | "young-vibe"
  | "climbing"
  | "view";

export interface TravelPackage {
  /** Unique numeric identifier (1-based). */
  readonly id: number;
  /** Human-readable experience title. */
  readonly title: string;
  /** Destination / area name. */
  readonly location: string;
  /** Price in USD. */
  readonly price: number;
  /** Descriptive tags used for matching. */
  readonly tags: PackageTag[];
}

// ---------------------------------------------------------------------------
// Inventory — the ONLY set of travel experiences the app may reference.
// The LLM system prompt and Zod validation both derive from this array,
// so adding / removing items here is the sole change needed.
// ---------------------------------------------------------------------------

export const travelPackages: readonly TravelPackage[] = [
  { id: 1, title: "High-Altitude Tea Trails", location: "Nuwara Eliya", price: 120, tags: ["cold", "nature", "hiking"] },
  { id: 2, title: "Coastal Heritage Wander", location: "Galle Fort", price: 45, tags: ["history", "culture", "walking"] },
  { id: 3, title: "Wild Safari Expedition", location: "Yala", price: 250, tags: ["animals", "adventure", "photography"] },
  { id: 4, title: "Surf & Chill Retreat", location: "Arugam Bay", price: 80, tags: ["beach", "surfing", "young-vibe"] },
  { id: 5, title: "Ancient City Exploration", location: "Sigiriya", price: 110, tags: ["history", "climbing", "view"] },
] as const;

/** Pre-computed set of valid IDs — shared by the API route for O(1) lookups. */
export const VALID_IDS = new Set(travelPackages.map((p) => p.id));
