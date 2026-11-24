import { z } from "zod";
import { CategoryIdSchema, PropertyTypeSchema } from "./common.js";
import { PromotionVoucherSchema, PropertySchema } from "./catalog.js";

export const PromotionCampaignPlacementSchema = z.enum(["hero", "carousel"]);

export type PromotionCampaignPlacement = z.infer<typeof PromotionCampaignPlacementSchema>;

export const PromotionCampaignThemeSchema = z.enum([
  "festive-night",
  "coral-summer",
  "ocean-teal",
  "luxury-gold",
  "forest-mist",
]);

export type PromotionCampaignTheme = z.infer<typeof PromotionCampaignThemeSchema>;

export const PromotionCampaignTargetFilterSchema = z.object({
  destinations: z.array(z.string().min(1)).optional(),
  categories: z.array(CategoryIdSchema).optional(),
  propertyTypes: z.array(PropertyTypeSchema).optional(),
  flashDealOnly: z.boolean().optional(),
});

export type PromotionCampaignTargetFilter = z.infer<typeof PromotionCampaignTargetFilterSchema>;

export const PromotionCampaignSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  placement: PromotionCampaignPlacementSchema,
  badge: z.string().min(1),
  title: z.string().min(1),
  subtitle: z.string().min(1),
  highlightText: z.string().min(1),
  periodLabel: z.string().min(1),
  image: z.string().min(1),
  theme: PromotionCampaignThemeSchema,
  ctaLabel: z.string().min(1),
  terms: z.array(z.string().min(1)).readonly(),
  voucherCodes: z.array(z.string().min(1)).readonly(),
  targetFilter: PromotionCampaignTargetFilterSchema,
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  isActive: z.boolean().default(true),
});

export type PromotionCampaign = z.infer<typeof PromotionCampaignSchema>;

export const DealsHubSchema = z.object({
  expiryLabel: z.string().min(1),
  vouchers: z.array(PromotionVoucherSchema).readonly(),
  campaigns: z.array(PromotionCampaignSchema).readonly(),
});

export type DealsHub = z.infer<typeof DealsHubSchema>;

export const DealDetailSchema = z.object({
  campaign: PromotionCampaignSchema,
  vouchers: z.array(PromotionVoucherSchema).readonly(),
  properties: z.array(PropertySchema).readonly(),
});

export type DealDetail = z.infer<typeof DealDetailSchema>;
