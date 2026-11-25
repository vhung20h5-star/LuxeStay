import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  TransferServiceSchema,
  TravelActivitySchema,
} from "@luxestay/contracts";
import {
  calculateActivityPricing,
  evaluateActivityBookingCancellation,
  evaluateActivitySlotAvailability,
  evaluateReservationActivityItemCancellation,
  filterActivities,
  findRecommendedActivitiesForCity,
  processServerReservationIntent,
  processStandaloneActivityBooking,
} from "../dist/index.js";
import {
  DESTINATIONS,
  PROMOTION_CAMPAIGNS,
  PROMOTION_VOUCHERS,
  PROPERTIES,
  TRAVEL_ACTIVITIES,
} from "../dist/seed/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_PUBLIC_DIR = path.resolve(__dirname, "../../../apps/web/public");

function normalizeMediaKey(src: string): string {
  const withoutQuery = src.split("?")[0] ?? src;
  const pexels = withoutQuery.match(/^https:\/\/images\.pexels\.com\/photos\/(\d+)\//);
  return pexels ? `pexels:${pexels[1]}` : withoutQuery;
}

test("TRAVEL_ACTIVITIES seed has 12 valid services with 0% global media duplication and local files on disk", () => {
  assert.equal(TRAVEL_ACTIVITIES.length, 12);

  const slugs = new Set<string>();
  const globalSeen = new Map<string, string>();

  for (const prop of PROPERTIES) {
    prop.images.forEach((src, i) => globalSeen.set(normalizeMediaKey(src), `${prop.id}[${i}]`));
  }
  for (const dest of DESTINATIONS) {
    globalSeen.set(normalizeMediaKey(dest.image), `destination:${dest.id}`);
  }
  for (const camp of PROMOTION_CAMPAIGNS) {
    globalSeen.set(normalizeMediaKey(camp.image), `campaign:${camp.slug}`);
  }

  for (const activity of TRAVEL_ACTIVITIES) {
    const parsed = TravelActivitySchema.safeParse(activity);
    assert.equal(parsed.success, true, `Invalid seed activity ${activity.id}`);
    assert.equal(slugs.has(activity.slug), false, `Duplicate slug ${activity.slug}`);
    slugs.add(activity.slug);

    if (activity.category === "transfer") {
      assert.equal(TransferServiceSchema.safeParse(activity).success, true);
    }

    for (const src of activity.images) {
      const key = normalizeMediaKey(src);
      assert.equal(
        globalSeen.has(key),
        false,
        `Activity ${activity.id} duplicates media key ${key} (first seen at ${globalSeen.get(key)})`
      );
      globalSeen.set(key, `activity:${activity.id}`);

      if (src.startsWith("/images/")) {
        const diskPath = path.join(WEB_PUBLIC_DIR, src.replace(/^\//, ""));
        assert.equal(fs.existsSync(diskPath), true, `Missing local asset ${diskPath}`);
        const size = fs.statSync(diskPath).size;
        assert.ok(size >= 5 * 1024 && size <= 350 * 1024, `Asset ${src} out of 5-350 KB bounds`);
      }
    }
  }
});

test("filterActivities and findRecommendedActivitiesForCity handle diacritics, categories, periods and city routes", () => {
  const transfers = filterActivities(TRAVEL_ACTIVITIES, { category: "transfer" });
  assert.equal(transfers.length, 4);

  const daLat = filterActivities(TRAVEL_ACTIVITIES, { city: "da lat" });
  assert.equal(daLat.length, 2);
  assert.equal(daLat[0].category, "transfer");

  const hoiAnRecs = findRecommendedActivitiesForCity(TRAVEL_ACTIVITIES, "Hội An");
  assert.ok(hoiAnRecs.some((a) => a.id === "act-03"));
  assert.ok(hoiAnRecs.some((a) => a.id === "act-09"));
  assert.equal(hoiAnRecs[0].category, "transfer");

  const eveningOnly = filterActivities(TRAVEL_ACTIVITIES, { period: "evening" });
  assert.ok(eveningOnly.length >= 2);
});

test("standalone activity booking enforces slot capacity, voucher rules, and cancellation ownership", () => {
  const act = TRAVEL_ACTIVITIES[0]; // act-01 Da Lat Transfer (380k)
  const slot = act.slots[0]; // maxCapacity 8

  const capacityFail = evaluateActivitySlotAvailability(act, slot.id, "2026-12-10", 5, 5);
  assert.equal(capacityFail.available, false);
  assert.equal(capacityFail.errorCode, "CONFLICT");

  // 4 transfers = 1,520,000 (>= 1,500,000 minOrderTotal) -> eligible for LUXESTAY250 (-250,000)
  const pricing = calculateActivityPricing(act, slot, 4, {
    promoCode: "LUXESTAY250",
    vouchers: PROMOTION_VOUCHERS,
  });
  assert.equal(pricing.subtotal, 1_520_000);
  assert.equal(pricing.discount, 250_000);
  assert.equal(pricing.total, 1_270_000);

  const booked = processStandaloneActivityBooking(
    {
      activityId: act.id,
      slotId: slot.id,
      dateIso: "2026-12-10",
      quantity: 4,
      guestInfo: {
        fullName: "Nguyễn An",
        phone: "0912345678",
        email: "an@luxestay.vn",
      },
      paymentMethod: "hotel",
      promoCode: "LUXESTAY250",
    },
    TRAVEL_ACTIVITIES,
    {
      bookingId: "ACT-TEST01",
      vouchers: PROMOTION_VOUCHERS,
    }
  );
  assert.equal(booked.ok, true);
  if (!booked.ok) return;
  assert.equal(booked.booking.total, 1_270_000);
  assert.equal(booked.booking.appliedPromoCode, "LUXESTAY250");

  const wrongContact = evaluateActivityBookingCancellation(booked.booking, {
    contact: "other@luxestay.vn",
  });
  assert.equal(wrongContact.ok, false);

  const cancelled = evaluateActivityBookingCancellation(booked.booking, {
    contact: "an@luxestay.vn",
    reason: "Đổi lịch bay",
  });
  assert.equal(cancelled.ok, true);
  if (cancelled.ok) {
    assert.equal(cancelled.booking.status, "cancelled");
    assert.equal(cancelled.booking.cancellationReason, "Đổi lịch bay");
  }
});

test("stay + activity bundle reservation recalculates activitiesFee and supports partial activity cancellation", () => {
  const stay = PROPERTIES[0]; // stay-01 Đà Lạt
  const transfer = TRAVEL_ACTIVITIES[0]; // act-01 380,000

  const created = processServerReservationIntent(
    {
      propertyId: stay.id,
      checkInSeed: "2026-12-10",
      nights: 2,
      guests: { adults: 2, children: 0, rooms: 1 },
      selectedAmenityIds: [],
      selectedActivities: [
        {
          activityId: transfer.id,
          slotId: transfer.slots[0].id,
          dateIso: "2026-12-10",
          quantity: 1,
        },
      ],
      guestInfo: {
        fullName: "Trần Bình",
        phone: "0988776655",
        email: "binh@luxestay.vn",
      },
      paymentMethod: "hotel",
    },
    PROPERTIES,
    {
      bookingId: "LX-BND001",
      activities: TRAVEL_ACTIVITIES,
      vouchers: PROMOTION_VOUCHERS,
    }
  );

  assert.equal(created.ok, true);
  if (!created.ok) return;
  assert.equal(created.booking.pricing.activitiesFee, 380_000);
  assert.equal(created.booking.selectedActivities.length, 1);

  const originalTotal = created.booking.pricing.total;
  const itemId = created.booking.selectedActivities[0].id;

  const partialCancel = evaluateReservationActivityItemCancellation(created.booking, itemId, {
    contact: "binh@luxestay.vn",
    reason: "Tự thuê xe máy",
    vouchers: PROMOTION_VOUCHERS,
  });

  assert.equal(partialCancel.ok, true);
  if (!partialCancel.ok) return;
  assert.equal(partialCancel.booking.status, "confirmed");
  assert.equal(partialCancel.booking.pricing.activitiesFee, 0);
  assert.equal(partialCancel.booking.pricing.total, originalTotal - 380_000);
  assert.equal(partialCancel.booking.selectedActivities[0].status, "cancelled");
});
