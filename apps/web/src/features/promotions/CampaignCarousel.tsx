"use client";

import React from "react";
import type { PromotionCampaign } from "@luxestay/contracts";
import { CampaignCard } from "./CampaignCard";
import { HorizontalCarouselShell } from "./HorizontalCarouselShell";

export interface CampaignCarouselProps {
  campaigns: readonly PromotionCampaign[];
}

/** 3-up desktop horizontal snap carousel for ongoing promotion campaigns. */
export function CampaignCarousel({ campaigns }: CampaignCarouselProps) {
  if (campaigns.length === 0) return null;

  return (
    <HorizontalCarouselShell
      itemCount={campaigns.length}
      prevTestId="campaign-carousel-prev"
      nextTestId="campaign-carousel-next"
    >
      {campaigns.map((campaign) => (
        <div
          key={campaign.id}
          className="w-[84%] sm:w-[47%] lg:w-[calc(33.333%-11px)] shrink-0 snap-start"
        >
          <CampaignCard campaign={campaign} />
        </div>
      ))}
    </HorizontalCarouselShell>
  );
}
