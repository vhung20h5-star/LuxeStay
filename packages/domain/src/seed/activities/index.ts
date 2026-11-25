import type { TravelActivity } from "@luxestay/contracts";
import { ATTRACTION_ACTIVITIES } from "./attractions.js";
import { ESSENTIAL_ACTIVITIES } from "./essentials.js";
import { EXPERIENCE_ACTIVITIES } from "./experiences.js";
import { TOUR_ACTIVITIES } from "./tours.js";
import { TRANSFER_ACTIVITIES } from "./transfers.js";

export { ATTRACTION_ACTIVITIES } from "./attractions.js";
export { ESSENTIAL_ACTIVITIES } from "./essentials.js";
export { EXPERIENCE_ACTIVITIES } from "./experiences.js";
export { TOUR_ACTIVITIES } from "./tours.js";
export { TRANSFER_ACTIVITIES } from "./transfers.js";
export type { SeedTravelActivity } from "./types.js";

export const TRAVEL_ACTIVITIES: readonly TravelActivity[] = Object.freeze([
  ...TRANSFER_ACTIVITIES,
  ...ATTRACTION_ACTIVITIES,
  ...TOUR_ACTIVITIES,
  ...ESSENTIAL_ACTIVITIES,
  ...EXPERIENCE_ACTIVITIES,
]);
