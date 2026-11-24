import type { CatalogSnapshot } from "@luxestay/contracts";
import {
  AMENITY_CATALOG,
  AMENITY_CATEGORIES,
  AMENITY_FILTER_OPTIONS,
} from "./amenities.js";
import { CATEGORIES } from "./categories.js";
import { DESTINATIONS } from "./destinations.js";
import { PROMOTION_EXPIRY_LABEL, PROMOTION_VOUCHERS } from "./promotions.js";
import { PROPERTIES } from "./properties.js";
import { TESTIMONIALS } from "./testimonials.js";

export {
  AMENITY_CATALOG,
  AMENITY_CATEGORIES,
  AMENITY_FILTER_OPTIONS,
} from "./amenities.js";
export { CATEGORIES } from "./categories.js";
export { DESTINATIONS } from "./destinations.js";
export {
  PROMOTION_CAMPAIGNS,
  PROMOTION_EXPIRY_LABEL,
  PROMOTION_VOUCHERS,
} from "./promotions.js";
export { PROPERTIES } from "./properties.js";
export { TESTIMONIALS } from "./testimonials.js";

export const SEED_CATALOG_SNAPSHOT: CatalogSnapshot = Object.freeze({
  properties: Object.freeze([...PROPERTIES]),
  categories: Object.freeze([...CATEGORIES]),
  destinations: Object.freeze([...DESTINATIONS]),
  amenityCategories: Object.freeze([...AMENITY_CATEGORIES]),
  amenityFilterOptions: Object.freeze([...AMENITY_FILTER_OPTIONS]),
  amenityCatalog: Object.freeze({ ...AMENITY_CATALOG }),
  promotions: Object.freeze({
    expiryLabel: PROMOTION_EXPIRY_LABEL,
    vouchers: PROMOTION_VOUCHERS,
  }),
  testimonials: TESTIMONIALS,
});
