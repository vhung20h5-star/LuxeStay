import test from "node:test";
import assert from "node:assert/strict";
import { PROPERTIES } from "../dist/seed/index.js";
import {
  DEMO_ADMIN_USER_ID,
  DEMO_HOST_USER_ID,
  canManageProperty,
  computeHostAnalytics,
  convertVndToCurrency,
  evaluateReservationCompletion,
  filterPropertiesForActor,
  formatMoney,
  isHostOrAdmin,
  processServerReservationIntent,
  translate,
} from "../dist/index.js";

const baseDate = new Date(2026, 10, 20);

test("RBAC helpers enforce guest, host ownership, and admin global access", () => {
  const stay01 = PROPERTIES.find((p) => p.id === "stay-01")!;
  const stay07 = PROPERTIES.find((p) => p.id === "stay-07")!;

  assert.equal(stay01.ownerUserId, DEMO_HOST_USER_ID);
  assert.equal(stay07.ownerUserId, undefined);

  const guest = { id: "USR-GUEST-1", role: "guest" as const };
  const host = { id: DEMO_HOST_USER_ID, role: "host" as const };
  const admin = { id: DEMO_ADMIN_USER_ID, role: "admin" as const };

  assert.equal(isHostOrAdmin(guest.role), false);
  assert.equal(isHostOrAdmin(host.role), true);
  assert.equal(isHostOrAdmin(admin.role), true);

  assert.equal(canManageProperty(guest, stay01), false);
  assert.equal(canManageProperty(host, stay01), true);
  assert.equal(canManageProperty(host, stay07), false);
  assert.equal(canManageProperty(admin, stay01), true);
  assert.equal(canManageProperty(admin, stay07), true);

  assert.equal(filterPropertiesForActor(PROPERTIES, guest).length, 0);
  assert.equal(filterPropertiesForActor(PROPERTIES, host).length, 6);
  assert.equal(filterPropertiesForActor(PROPERTIES, admin).length, PROPERTIES.length);
  assert.equal(PROPERTIES.length, 42);
});

test("computeHostAnalytics aggregates confirmed, completed, pending, cancelled revenue and monthly breakdown", () => {
  const hostProps = PROPERTIES.filter((p) => p.ownerUserId === DEMO_HOST_USER_ID);
  const b1 = processServerReservationIntent(
    {
      propertyId: "stay-01",
      checkInSeed: "2026-12-08",
      nights: 2,
      guests: { adults: 2, children: 0, rooms: 1 },
      selectedAmenityIds: [],
      guestInfo: { fullName: "Guest 1", phone: "0912345678", email: "g1@luxestay.vn" },
      paymentMethod: "hotel",
    },
    PROPERTIES,
    { bookingId: "LX-ANA01", fallbackBaseDate: baseDate }
  );
  const b2 = processServerReservationIntent(
    {
      propertyId: "stay-02",
      checkInSeed: "2027-01-12",
      nights: 3,
      guests: { adults: 2, children: 0, rooms: 1 },
      selectedAmenityIds: [],
      guestInfo: { fullName: "Guest 2", phone: "0912345678", email: "g2@luxestay.vn" },
      paymentMethod: "hotel",
    },
    PROPERTIES,
    { bookingId: "LX-ANA02", fallbackBaseDate: baseDate }
  );
  const bOtherHost = processServerReservationIntent(
    {
      propertyId: "stay-07",
      checkInSeed: "2026-12-08",
      nights: 2,
      guests: { adults: 2, children: 0, rooms: 1 },
      selectedAmenityIds: [],
      guestInfo: { fullName: "Other", phone: "0912345678", email: "other@luxestay.vn" },
      paymentMethod: "hotel",
    },
    PROPERTIES,
    { bookingId: "LX-ANA03", fallbackBaseDate: baseDate }
  );
  assert.ok(b1.ok && b2.ok && bOtherHost.ok);
  const completedB2 = evaluateReservationCompletion(
    b2.booking,
    {},
    { bypassOwnershipCheck: true, completedAt: "2027-01-15T12:00:00.000Z" }
  );
  assert.ok(completedB2.ok);

  const analytics = computeHostAnalytics(hostProps, [
    b1.booking,
    completedB2.booking,
    bOtherHost.booking,
  ]);

  // Must ignore bOtherHost (stay-07 not owned by host)
  assert.equal(analytics.totalProperties, 6);
  assert.equal(analytics.totalBookings, 2);
  assert.equal(analytics.confirmedBookings, 1);
  assert.equal(analytics.completedBookings, 1);
  assert.equal(analytics.confirmedRevenue, b1.booking.pricing.total);
  assert.equal(analytics.completedRevenue, completedB2.booking.pricing.total);
  assert.equal(
    analytics.totalRevenue,
    b1.booking.pricing.total + completedB2.booking.pricing.total
  );
  assert.equal(analytics.monthlyRevenue.length, 2);
  assert.equal(analytics.monthlyRevenue[0]?.month, "2026-12");
  assert.equal(analytics.monthlyRevenue[1]?.month, "2027-01");
});

test("locale translation and multi-currency VND/USD conversion format deterministically", () => {
  assert.equal(convertVndToCurrency(1_250_000, "VND"), 1_250_000);
  assert.equal(convertVndToCurrency(1_250_000, "USD"), 50);
  assert.equal(convertVndToCurrency(1_375_000, "USD"), 55);

  const vndFormatted = formatMoney(1_250_000, "VND", "vi");
  assert.ok(vndFormatted.includes("1.250.000"));
  const usdFormatted = formatMoney(1_250_000, "USD", "en");
  assert.equal(usdFormatted, "$50");

  assert.equal(translate("vi", "nav.hostPortal"), "Cổng Chủ nhà");
  assert.equal(translate("en", "nav.hostPortal"), "Host Portal");
  assert.equal(
    translate("en", "catalog.resultsCount", { count: 12 }),
    "Found 12 matching stays"
  );
  assert.equal(
    translate("vi", "catalog.resultsCount", { count: 42 }),
    "Tìm thấy 42 chỗ nghỉ phù hợp"
  );
  assert.equal(
    translate("vi", "catalog.showingCount", { shown: 12, total: 42 }),
    "Đang hiển thị 12 / 42 chỗ nghỉ"
  );
  assert.equal(
    translate("en", "catalog.showingCount", { shown: 12, total: 42 }),
    "Showing 12 of 42 stays"
  );
  assert.equal(
    translate("vi", "catalog.loadMore", { count: 12 }),
    "Xem thêm 12 chỗ nghỉ"
  );
  assert.equal(
    translate("en", "catalog.loadMore", { count: 12 }),
    "Show 12 more stays"
  );
  assert.notEqual(
    translate("vi", "catalog.collapse"),
    translate("en", "catalog.collapse")
  );

  const viDealsTitle = translate("vi", "deals.newUserTitle");
  const enDealsTitle = translate("en", "deals.newUserTitle");
  assert.ok(viDealsTitle.length > 0);
  assert.ok(enDealsTitle.length > 0);
  assert.notEqual(viDealsTitle, enDealsTitle);

  const dealsKeys = [
    "deals.newUserTitle",
    "deals.newUserSubtitle",
    "deals.ongoingTitle",
    "deals.viewAll",
    "deals.copy",
    "deals.copied",
    "deals.viewDeal",
    "deals.termsApply",
    "deals.endsIn",
    "deals.days",
    "deals.hours",
    "deals.minutes",
    "deals.seconds",
    "deals.modalTitle",
    "deals.minOrder",
    "deals.expiry",
    "deals.scope",
    "deals.conditions",
    "deals.filterAll",
    "deals.filterNewUser",
    "deals.filterMember",
    "deals.backToDeals",
    "deals.matchingStays",
    "deals.matchingStaysSubtitle",
    "deals.autoApplySelected",
    "deals.selectToApply",
    "deals.noMatchingStays",
    "deals.featuredCode",
  ] as const;

  for (const key of dealsKeys) {
    const viText = translate("vi", key);
    const enText = translate("en", key);
    assert.ok(viText.trim().length > 0 && viText !== key, `Missing vi translation for ${key}`);
    assert.ok(enText.trim().length > 0 && enText !== key, `Missing en translation for ${key}`);
  }
});
