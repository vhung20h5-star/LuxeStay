import type { TransferService, TravelActivity } from "@luxestay/contracts";
import { RAW_ATTRACTION_ACTIVITIES } from "./attractions.js";
import { enrichTransferActivities, enrichTravelActivities } from "./enrichment.js";
import { RAW_ESSENTIAL_ACTIVITIES } from "./essentials.js";
import { RAW_EXPERIENCE_ACTIVITIES } from "./experiences.js";
import { RAW_TOUR_ACTIVITIES } from "./tours.js";
import { RAW_TRANSFER_ACTIVITIES } from "./transfers.js";

export const TRANSFER_ACTIVITIES: readonly TransferService[] =
  enrichTransferActivities(RAW_TRANSFER_ACTIVITIES);
export const ATTRACTION_ACTIVITIES: readonly TravelActivity[] =
  enrichTravelActivities(RAW_ATTRACTION_ACTIVITIES);
export const TOUR_ACTIVITIES: readonly TravelActivity[] =
  enrichTravelActivities(RAW_TOUR_ACTIVITIES);
export const ESSENTIAL_ACTIVITIES: readonly TravelActivity[] =
  enrichTravelActivities(RAW_ESSENTIAL_ACTIVITIES);
export const EXPERIENCE_ACTIVITIES: readonly TravelActivity[] =
  enrichTravelActivities(RAW_EXPERIENCE_ACTIVITIES);

export type {
  SeedTransferServiceBase,
  SeedTravelActivity,
  SeedTravelActivityBase,
} from "./types.js";

export const TRAVEL_ACTIVITIES: readonly TravelActivity[] = Object.freeze([
  ...TRANSFER_ACTIVITIES,
  ...ATTRACTION_ACTIVITIES,
  ...TOUR_ACTIVITIES,
  ...ESSENTIAL_ACTIVITIES,
  ...EXPERIENCE_ACTIVITIES,
]);
