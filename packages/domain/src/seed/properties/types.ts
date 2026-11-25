import type { Property } from "@luxestay/contracts";

export type SeedPropertyDraft = Omit<Property, "inventoryCount">;
