import type { PromotionCampaign } from "@luxestay/contracts";
import { PROMOTION_CAMPAIGNS } from "@luxestay/domain/seed";

export interface ApiDealsRepository {
  getCampaigns(): Promise<readonly PromotionCampaign[]>;
  getCampaignBySlug(slug: string): Promise<PromotionCampaign | null>;
}

function cloneCampaign(campaign: PromotionCampaign): PromotionCampaign {
  return {
    ...campaign,
    terms: [...campaign.terms],
    voucherCodes: [...campaign.voucherCodes],
    targetFilter: {
      ...(campaign.targetFilter.destinations
        ? { destinations: [...campaign.targetFilter.destinations] }
        : {}),
      ...(campaign.targetFilter.categories
        ? { categories: [...campaign.targetFilter.categories] }
        : {}),
      ...(campaign.targetFilter.propertyTypes
        ? { propertyTypes: [...campaign.targetFilter.propertyTypes] }
        : {}),
      ...(campaign.targetFilter.flashDealOnly !== undefined
        ? { flashDealOnly: campaign.targetFilter.flashDealOnly }
        : {}),
    },
  };
}

/** Creates an isolated in-memory deals repository backed by seed or provided campaigns. */
export function createInMemoryDealsRepository(
  initialCampaigns: readonly PromotionCampaign[] = PROMOTION_CAMPAIGNS
): ApiDealsRepository {
  const campaigns = initialCampaigns.map(cloneCampaign);

  return {
    async getCampaigns(): Promise<readonly PromotionCampaign[]> {
      return Object.freeze(campaigns.map(cloneCampaign));
    },

    async getCampaignBySlug(slug: string): Promise<PromotionCampaign | null> {
      const normalized = slug.trim().toLowerCase();
      if (!normalized) return null;
      const found = campaigns.find(
        (campaign) => campaign.slug.trim().toLowerCase() === normalized
      );
      return found ? cloneCampaign(found) : null;
    },
  };
}
