import type { TravelActivity } from "@luxestay/contracts";
import { EXPERIENCE_ACTIVITIES } from "./experiences.js";
import { TOUR_ACTIVITIES } from "./tours.js";
import { TRANSFER_ACTIVITIES } from "./transfers.js";

export { EXPERIENCE_ACTIVITIES } from "./experiences.js";
export { TOUR_ACTIVITIES } from "./tours.js";
export { TRANSFER_ACTIVITIES } from "./transfers.js";
export type { SeedTravelActivity } from "./types.js";

export const TRAVEL_ACTIVITIES: readonly TravelActivity[] = Object.freeze([
  ...TRANSFER_ACTIVITIES,
  ...TOUR_ACTIVITIES,
  ...EXPERIENCE_ACTIVITIES,
]);
