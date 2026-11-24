import type { DealDetail, DealsHub } from "@luxestay/contracts";
import { matchPropertiesForCampaign, resolveCampaignVouchers } from "@luxestay/domain";
import type { ApiCatalogRepository } from "../catalog/repository.js";
import type { ApiDealsRepository } from "./repository.js";

export interface DealsService {
  getDealsHub(): Promise<DealsHub>;
  getDealBySlug(slug: string): Promise<DealDetail | null>;
}

/** Creates the independent deals service aggregating campaigns, vouchers, and matched stays. */
export function createDealsService(deps: {
  dealsRepository: ApiDealsRepository;
  catalogRepository: ApiCatalogRepository;
}): DealsService {
  return {
    async getDealsHub(): Promise<DealsHub> {
      const [campaigns, snapshot] = await Promise.all([
        deps.dealsRepository.getCampaigns(),
        deps.catalogRepository.getSnapshot(),
      ]);

      return {
        expiryLabel: snapshot.promotions.expiryLabel,
        vouchers: snapshot.promotions.vouchers,
        campaigns,
      };
    },

    async getDealBySlug(slug: string): Promise<DealDetail | null> {
      const normalized = slug.trim().toLowerCase();
      if (!normalized) return null;

      const campaign = await deps.dealsRepository.getCampaignBySlug(normalized);
      if (!campaign || !campaign.isActive) {
        return null;
      }

      const snapshot = await deps.catalogRepository.getSnapshot();
      const vouchers = resolveCampaignVouchers(campaign, snapshot.promotions.vouchers);
      const properties = matchPropertiesForCampaign(snapshot.properties, campaign);

      return {
        campaign,
        vouchers,
        properties,
      };
    },
  };
}
