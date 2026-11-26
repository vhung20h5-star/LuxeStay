import type { TransferService, TravelActivity } from "@luxestay/contracts";

export type SeedTravelActivity = TravelActivity;

type SeedAutoEnrichedKeys =
  | "excluded"
  | "itinerary"
  | "knowBeforeYouGo"
  | "suitableFor"
  | "languages";

export type SeedTravelActivityBase = Omit<TravelActivity, SeedAutoEnrichedKeys> &
  Partial<Pick<TravelActivity, SeedAutoEnrichedKeys>>;

export type SeedTransferServiceBase = Omit<TransferService, SeedAutoEnrichedKeys> &
  Partial<Pick<TransferService, SeedAutoEnrichedKeys>>;
