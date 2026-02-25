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
  readonly id: number;
  readonly title: string;
  readonly location: string;
  readonly price: number;
  readonly tags: PackageTag[];
}

export const travelPackages: readonly TravelPackage[] = [
  { id: 1, title: "High-Altitude Tea Trails", location: "Nuwara Eliya", price: 120, tags: ["cold", "nature", "hiking"] },
  { id: 2, title: "Coastal Heritage Wander", location: "Galle Fort", price: 45, tags: ["history", "culture", "walking"] },
  { id: 3, title: "Wild Safari Expedition", location: "Yala", price: 250, tags: ["animals", "adventure", "photography"] },
  { id: 4, title: "Surf & Chill Retreat", location: "Arugam Bay", price: 80, tags: ["beach", "surfing", "young-vibe"] },
  { id: 5, title: "Ancient City Exploration", location: "Sigiriya", price: 110, tags: ["history", "climbing", "view"] },
] as const;

export const VALID_IDS = new Set(travelPackages.map((p) => p.id));

export const packageById = new Map(
  travelPackages.map((p) => [p.id, p]),
);
