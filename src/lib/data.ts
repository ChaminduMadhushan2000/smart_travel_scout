// data.ts - this is where all the travel packages are stored
// both the AI prompt and the backend use this same data, so if we add
// a new package we only need to update it here

// all the possible tags a package can have
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

// interface for a single travel package
export interface TravelPackage {
  readonly id: number;
  readonly title: string;
  readonly location: string;
  readonly price: number;
  readonly tags: PackageTag[];
}

// our 5 Sri Lankan travel packages (hardcoded for now)
export const travelPackages: readonly TravelPackage[] = [
  { id: 1, title: "High-Altitude Tea Trails", location: "Nuwara Eliya", price: 120, tags: ["cold", "nature", "hiking"] },
  { id: 2, title: "Coastal Heritage Wander", location: "Galle Fort", price: 45, tags: ["history", "culture", "walking"] },
  { id: 3, title: "Wild Safari Expedition", location: "Yala", price: 250, tags: ["animals", "adventure", "photography"] },
  { id: 4, title: "Surf & Chill Retreat", location: "Arugam Bay", price: 80, tags: ["beach", "surfing", "young-vibe"] },
  { id: 5, title: "Ancient City Exploration", location: "Sigiriya", price: 110, tags: ["history", "climbing", "view"] },
] as const;

// set of valid IDs so we can quickly check if the AI returned a real package
export const VALID_IDS = new Set(travelPackages.map((p) => p.id));

// map for quick lookup by id instead of looping through the array every time
export const packageById = new Map(
  travelPackages.map((p) => [p.id, p]),
);
