import { asc, eq, sql } from "drizzle-orm";
import type { PromotionCampaign } from "@luxestay/contracts";
import type { LuxeStayDb } from "../../db/client.js";
import { promotionCampaignsTable } from "../../db/schema/index.js";
import type { ApiDealsRepository } from "./repository.js";

export type PromotionCampaignRow = typeof promotionCampaignsTable.$inferSelect;

/** Maps a promotion_campaigns Postgres row into a contract-compliant PromotionCampaign. */
export function mapCampaignRowToDomain(row: PromotionCampaignRow): PromotionCampaign {
  const filter = row.targetFilter ?? {};

  return {
    id: row.id,
    slug: row.slug,
    placement: row.placement,
    badge: row.badge,
    title: row.title,
    subtitle: row.subtitle,
    highlightText: row.highlightText,
    periodLabel: row.periodLabel,
    image: row.image,
    theme: row.theme,
    ctaLabel: row.ctaLabel,
    terms: [...(row.terms ?? [])],
    voucherCodes: [...(row.voucherCodes ?? [])],
    targetFilter: {
      ...(filter.destinations ? { destinations: [...filter.destinations] } : {}),
      ...(filter.categories ? { categories: [...filter.categories] } : {}),
      ...(filter.propertyTypes ? { propertyTypes: [...filter.propertyTypes] } : {}),
      ...(filter.flashDealOnly !== undefined ? { flashDealOnly: filter.flashDealOnly } : {}),
    },
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    isActive: row.isActive,
  };
}

/** Creates a Postgres-backed deals repository querying promotion_campaigns. */
export function createPostgresDealsRepository(db: LuxeStayDb): ApiDealsRepository {
  return {
    async getCampaigns(): Promise<readonly PromotionCampaign[]> {
      const rows = await db
        .select()
        .from(promotionCampaignsTable)
        .orderBy(asc(promotionCampaignsTable.sortOrder));
      return Object.freeze(rows.map(mapCampaignRowToDomain));
    },

    async getCampaignBySlug(slug: string): Promise<PromotionCampaign | null> {
      const normalized = slug.trim().toLowerCase();
      if (!normalized) return null;

      const rows = await db
        .select()
        .from(promotionCampaignsTable)
        .where(eq(sql`lower(${promotionCampaignsTable.slug})`, normalized))
        .limit(1);

      return rows[0] ? mapCampaignRowToDomain(rows[0]) : null;
    },
  };
}
