"use client";

import React from "react";
import type { PromotionVoucher } from "@luxestay/contracts";
import { HorizontalCarouselShell } from "./HorizontalCarouselShell";
import { VoucherCard } from "./VoucherCard";

export interface VoucherCarouselProps {
  vouchers: readonly PromotionVoucher[];
  copiedCode: string | null;
  onCopy: (code: string) => void;
  onInspect: (voucher: PromotionVoucher) => void;
}

/** Responsive horizontal snap-scroll strip of ticket-notched voucher cards. */
export function VoucherCarousel({
  vouchers,
  copiedCode,
  onCopy,
  onInspect,
}: VoucherCarouselProps) {
  if (vouchers.length === 0) return null;

  return (
    <HorizontalCarouselShell
      itemCount={vouchers.length}
      prevTestId="voucher-carousel-prev"
      nextTestId="voucher-carousel-next"
    >
      {vouchers.map((voucher) => (
        <div
          key={voucher.id}
          className="w-[86%] sm:w-[48%] lg:w-[calc(33.333%-11px)] shrink-0 snap-start"
        >
          <VoucherCard
            voucher={voucher}
            copied={copiedCode === voucher.code}
            onCopy={onCopy}
            onInspect={onInspect}
          />
        </div>
      ))}
    </HorizontalCarouselShell>
  );
}
