import test from "node:test";
import assert from "node:assert/strict";
import {
  ActivitiesCatalogResponseSchema,
  ActivityBookingSchema,
  ActivityDetailResponseSchema,
  API_ENDPOINTS,
  ApiErrorResponseSchema,
  AuthUserSchema,
  buildApiError,
  buildApiSuccess,
  CancelReservationInputSchema,
  createApiSuccessSchema,
  CreateHostPropertyInputSchema,
  CreateReviewInputSchema,
  DealDetailSchema,
  DealsHubSchema,
  GuestInfoSchema,
  HealthDataSchema,
  HostAnalyticsDataSchema,
  LoginInputSchema,
  OtpRequestInputSchema,
  OtpVerifyInputSchema,
  PaymentWebhookPayloadSchema,
  PromotionVoucherSchema,
  PropertyAvailabilityDataSchema,
  RegisterInputSchema,
  ReservationLookupInputSchema,
  ServerReservationIntentSchema,
  ServiceBookingIntentSchema,
  TransferServiceSchema,
  TravelActivitySchema,
  UpsertHostAvailabilityInputSchema,
  ValidateVoucherInputSchema,
} from "../dist/index.js";

test("ApiSuccess and ApiError builders produce contract-compliant envelopes", () => {
  const healthSuccess = buildApiSuccess(
    { status: "ok" as const, service: "luxestay-api" },
    { requestId: "req-1", timestamp: "2026-11-24T00:00:00.000Z" }
  );
  const parsedSuccess = createApiSuccessSchema(HealthDataSchema).safeParse(healthSuccess);
  assert.equal(parsedSuccess.success, true);

  const errorEnvelope = buildApiError(
    "VALIDATION_ERROR",
    "Dữ liệu không hợp lệ",
    [{ field: "guestInfo.phone" }],
    { requestId: "req-2", timestamp: "2026-11-24T00:00:00.000Z" }
  );
  const parsedError = ApiErrorResponseSchema.safeParse(errorEnvelope);
  assert.equal(parsedError.success, true);
});

test("ServerReservationIntentSchema accepts valid intent, strips unknown fields, and rejects bad phone/email", () => {
  const validPayload = {
    propertyId: "stay-01",
    checkInSeed: "2026-12-20",
    nights: 3,
    guests: { adults: 2, children: 0, rooms: 1 },
    selectedAmenityIds: ["airport-shuttle"],
    guestInfo: {
      fullName: "  Nguyễn Văn A  ",
      phone: "0912 345 678",
      email: "guest@luxestay.vn",
      note: "  ",
    },
    paymentMethod: "momo",
    pricing: { total: 1 }, // client tampering attempt must be stripped
  };

  const okResult = ServerReservationIntentSchema.safeParse(validPayload);
  assert.equal(okResult.success, true);
  if (okResult.success) {
    assert.equal(okResult.data.guestInfo.fullName, "Nguyễn Văn A");
    assert.equal(okResult.data.guestInfo.note, undefined);
    assert.equal("pricing" in okResult.data, false);
  }

  const badPhone = GuestInfoSchema.safeParse({
    fullName: "Nguyễn Văn A",
    phone: "12345",
    email: "guest@luxestay.vn",
  });
  assert.equal(badPhone.success, false);

  const badEmail = GuestInfoSchema.safeParse({
    fullName: "Nguyễn Văn A",
    phone: "+84912345678",
    email: "not-an-email",
  });
  assert.equal(badEmail.success, false);
});

test("API_ENDPOINTS exposes versioned paths and encodes property & reservation IDs safely", () => {
  assert.equal(API_ENDPOINTS.health, "/health");
  assert.equal(API_ENDPOINTS.catalog, "/api/v1/catalog");
  assert.equal(API_ENDPOINTS.reservations, "/api/v1/reservations");
  assert.equal(API_ENDPOINTS.propertyById("stay-01"), "/api/v1/properties/stay-01");
  assert.equal(API_ENDPOINTS.propertyById("a/b c"), "/api/v1/properties/a%2Fb%20c");
  assert.equal(API_ENDPOINTS.reservationById(" lx-ab1234 "), "/api/v1/reservations/LX-AB1234");
  assert.equal(
    API_ENDPOINTS.cancelReservation("lx-ab1234"),
    "/api/v1/reservations/LX-AB1234/cancel"
  );
});

test("ReservationLookupInputSchema and CancelReservationInputSchema normalize inputs and enforce required contact", () => {
  const lookup = ReservationLookupInputSchema.safeParse({
    bookingId: " lx-123abc ",
    contact: " guest@luxestay.vn ",
  });
  assert.equal(lookup.success, true);
  if (lookup.success) {
    assert.equal(lookup.data.bookingId, "LX-123ABC");
    assert.equal(lookup.data.contact, "guest@luxestay.vn");
  }

  assert.equal(
    ReservationLookupInputSchema.safeParse({ bookingId: "", contact: "a@b.com" }).success,
    false
  );
  assert.equal(
    CancelReservationInputSchema.safeParse({ contact: "   " }).success,
    false
  );

  const cancel = CancelReservationInputSchema.safeParse({
    contact: "0912345678",
    reason: "  Đổi lịch công tác  ",
  });
  assert.equal(cancel.success, true);
  if (cancel.success) {
    assert.equal(cancel.data.reason, "Đổi lịch công tác");
  }
});

test("Phase 2 auth, voucher, and payment webhook contracts validate payloads and endpoints", () => {
  const reg = RegisterInputSchema.safeParse({
    fullName: "  Lê Minh Anh  ",
    email: "  ANH@LUXESTAY.VN ",
    phone: "0912345678",
    password: "secret123",
  });
  assert.equal(reg.success, true);
  if (reg.success) {
    assert.equal(reg.data.email, "anh@luxestay.vn");
    assert.equal(reg.data.fullName, "Lê Minh Anh");
  }

  assert.equal(LoginInputSchema.safeParse({ email: "bad", password: "123" }).success, false);
  assert.equal(OtpRequestInputSchema.safeParse({ identifier: "0912345678" }).success, true);
  assert.equal(OtpRequestInputSchema.safeParse({ identifier: "user@luxestay.vn" }).success, true);
  assert.equal(OtpRequestInputSchema.safeParse({ identifier: "invalid" }).success, false);
  assert.equal(OtpVerifyInputSchema.safeParse({ identifier: "0912345678", code: "123456" }).success, true);
  assert.equal(OtpVerifyInputSchema.safeParse({ identifier: "0912345678", code: "12ab" }).success, false);

  const intentWithPromo = ServerReservationIntentSchema.safeParse({
    propertyId: "stay-01",
    nights: 2,
    guests: { adults: 2, children: 0, rooms: 1 },
    guestInfo: { fullName: "Test User", phone: "0912345678", email: "test@luxestay.vn" },
    paymentMethod: "vnpay",
    promoCode: " luxestay250 ",
  });
  assert.equal(intentWithPromo.success, true);
  if (intentWithPromo.success) {
    assert.equal(intentWithPromo.data.promoCode, "LUXESTAY250");
  }

  const webhook = PaymentWebhookPayloadSchema.safeParse({
    eventId: "evt-001",
    transactionId: "TXN-ABC123",
    bookingId: "LX-123456",
    provider: "vnpay",
    outcome: "succeeded",
    amount: 2500000,
    occurredAt: "2026-11-24T08:00:00.000Z",
  });
  assert.equal(webhook.success, true);

  assert.equal(API_ENDPOINTS.validateVoucher, "/api/v1/vouchers/validate");
  assert.equal(API_ENDPOINTS.authLogin, "/api/v1/auth/login");
  assert.equal(API_ENDPOINTS.favorites, "/api/v1/favorites");
  assert.equal(API_ENDPOINTS.paymentWebhook("VNPAY"), "/api/v1/payments/webhook/vnpay");
  assert.equal(API_ENDPOINTS.paymentSimulate("txn-01"), "/api/v1/payments/TXN-01/simulate");
});

test("Phase 3A availability and verified review contracts validate payloads and endpoints", () => {
  const availability = PropertyAvailabilityDataSchema.safeParse({
    propertyId: "stay-01",
    inventoryCount: 1,
    from: "2026-12-01",
    to: "2026-12-02",
    days: [
      {
        date: "2026-12-01",
        totalUnits: 1,
        bookedUnits: 0,
        remainingUnits: 1,
        isBlocked: false,
        isAvailable: true,
        basePrice: 1250000,
        effectivePrice: 1250000,
        priceReason: "base",
      },
    ],
  });
  assert.equal(availability.success, true);

  const reviewOk = CreateReviewInputSchema.safeParse({
    bookingId: " lx-ab1234 ",
    rating: 5,
    comment: "  Phòng rất đẹp, view rừng thông tuyệt vời và chủ nhà hỗ trợ chu đáo! ",
  });
  assert.equal(reviewOk.success, true);
  if (reviewOk.success) {
    assert.equal(reviewOk.data.bookingId, "LX-AB1234");
  }

  assert.equal(
    CreateReviewInputSchema.safeParse({ bookingId: "LX-1", rating: 5, comment: "Quá ngắn" }).success,
    false
  );
  assert.equal(
    CreateReviewInputSchema.safeParse({ bookingId: "LX-1", rating: 6, comment: "Đánh giá đủ dài hơn mười ký tự" }).success,
    false
  );

  assert.equal(API_ENDPOINTS.propertyAvailability("stay-01"), "/api/v1/properties/stay-01/availability");
  assert.equal(API_ENDPOINTS.propertyReviews("stay-01"), "/api/v1/properties/stay-01/reviews");
  assert.equal(API_ENDPOINTS.completeReservation("lx-ab1234"), "/api/v1/reservations/LX-AB1234/complete");
});

test("Phase 3B RBAC, Host CRUD, availability overrides, and analytics contracts validate payloads", () => {
  const defaultGuest = AuthUserSchema.parse({
    id: "USR-1",
    email: "guest@luxestay.vn",
    fullName: "Guest User",
    provider: "password",
    createdAt: "2026-11-24T00:00:00.000Z",
  });
  assert.equal(defaultGuest.role, "guest");

  const hostProp = CreateHostPropertyInputSchema.safeParse({
    title: "Pine Hill Boutique Villa Đà Lạt",
    subtitle: "Biệt thự rừng thông view đồi đón bình minh",
    propertyType: "villa",
    category: "pine-forest",
    location: {
      city: "Đà Lạt",
      province: "Lâm Đồng",
      address: "Đường Đống Đa, Phường 3",
      distanceToCenter: "Cách trung tâm 2.5 km",
    },
    images: ["https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=1200&q=80"],
    pricePerNight: 2_200_000,
    inventoryCount: 1,
    maxGuests: 6,
    bedrooms: 3,
    beds: 3,
    bathrooms: 3,
    description: "Biệt thự thiết kế gỗ thông tự nhiên với sân BBQ riêng và lò sưởi ấm cúng cho gia đình.",
    amenityIds: ["high-speed-wifi", "garden-bbq"],
  });
  assert.equal(hostProp.success, true);

  const availUpsert = UpsertHostAvailabilityInputSchema.safeParse({
    dates: [
      { date: "2027-01-15", isBlocked: true, note: "Bảo trì" },
      { date: "2027-01-16", isBlocked: false, overridePrice: 2_800_000 },
    ],
  });
  assert.equal(availUpsert.success, true);

  assert.equal(
    HostAnalyticsDataSchema.safeParse({
      totalRevenue: 5_000_000,
      confirmedRevenue: 2_000_000,
      completedRevenue: 3_000_000,
      totalBookings: 2,
      confirmedBookings: 1,
      completedBookings: 1,
      pendingBookings: 0,
      cancelledBookings: 0,
      averageOrderValue: 2_500_000,
      totalProperties: 6,
      propertyBreakdown: [],
      monthlyRevenue: [{ month: "2026-12", revenue: 5_000_000, bookingsCount: 2 }],
    }).success,
    true
  );

  assert.equal(API_ENDPOINTS.hostProperties, "/api/v1/host/properties");
  assert.equal(API_ENDPOINTS.hostPropertyAvailability("stay-01"), "/api/v1/host/properties/stay-01/availability");
  assert.equal(API_ENDPOINTS.hostAnalytics, "/api/v1/host/analytics");
});

test("Promotions Hub and Deals contracts validate extended vouchers, campaigns, deal details, and endpoints", () => {
  const legacyVoucher = PromotionVoucherSchema.parse({
    id: "v-legacy",
    code: "LUXESTAY250",
    description: "Giảm 250.000đ cho đơn từ 1.500.000đ",
    tone: "emerald",
  });
  assert.equal(legacyVoucher.audience, "all");
  assert.equal(legacyVoucher.newUserOnly, false);

  const extendedVoucher = PromotionVoucherSchema.parse({
    id: "v-ext",
    code: "NEWSTAY250",
    description: "Ưu đãi khách mới giảm 250.000đ",
    tone: "amber",
    discountType: "fixed",
    discountValue: 250_000,
    minOrderTotal: 1_500_000,
    title: "Chào bạn mới",
    subtitle: "Áp dụng cho kỳ nghỉ đầu tiên",
    badge: "MỚI",
    iconName: "sparkles",
    audience: "new-user",
    newUserOnly: true,
    applicablePropertyTypes: ["hotel", "resort"],
    applicableCategories: ["luxury-resort"],
    terms: ["Áp dụng cho đơn đầu tiên", "Không cộng dồn ưu đãi khác"],
  });
  assert.equal(extendedVoucher.audience, "new-user");
  assert.equal(extendedVoucher.newUserOnly, true);
  assert.deepEqual(extendedVoucher.applicablePropertyTypes, ["hotel", "resort"]);
  assert.deepEqual(extendedVoucher.applicableCategories, ["luxury-resort"]);

  assert.equal(
    ValidateVoucherInputSchema.safeParse({ code: "LUXESTAY250", subtotal: 2_000_000 }).success,
    true
  );
  const validateWithProperty = ValidateVoucherInputSchema.safeParse({
    code: "NEWSTAY250",
    subtotal: 2_000_000,
    propertyId: "stay-02",
  });
  assert.equal(validateWithProperty.success, true);
  if (validateWithProperty.success) {
    assert.equal(validateWithProperty.data.propertyId, "stay-02");
  }

  const validCampaign = {
    id: "cmp-01",
    slug: "black-friday-2026",
    placement: "hero" as const,
    badge: "BLACK FRIDAY",
    title: "Black Friday Sale 2026",
    subtitle: "Giảm đến 40% resort và khách sạn cao cấp",
    highlightText: "Giảm thêm 250.000đ với mã LUXESTAY250",
    periodLabel: "20/11 - 30/11/2026",
    image: "https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=1200&q=80",
    theme: "festive-night" as const,
    ctaLabel: "Khám phá ưu đãi",
    terms: ["Áp dụng cho kỳ nghỉ trước 31/12/2026"],
    voucherCodes: ["LUXESTAY250"],
    targetFilter: {
      destinations: ["Đà Lạt", "Phú Quốc"],
      categories: ["luxury-resort" as const],
      propertyTypes: ["resort" as const],
      flashDealOnly: true,
    },
    startsAt: "2026-11-20T00:00:00.000Z",
    endsAt: "2026-11-30T23:59:59.000Z",
  };

  const validProperty = {
    id: "stay-01",
    title: "Pine Hill Boutique Villa Đà Lạt",
    subtitle: "Biệt thự rừng thông view đồi đón bình minh",
    propertyType: "resort" as const,
    category: "luxury-resort" as const,
    location: {
      city: "Đà Lạt",
      province: "Lâm Đồng",
      address: "Đường Đống Đa, Phường 3",
      distanceToCenter: "Cách trung tâm 2.5 km",
    },
    images: ["https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=1200&q=80"],
    pricePerNight: 2_200_000,
    rating: 4.9,
    reviewCount: 42,
    maxGuests: 6,
    bedrooms: 3,
    beds: 3,
    bathrooms: 3,
    resortAmenities: [],
    description: "Biệt thự thiết kế gỗ thông tự nhiên với sân BBQ riêng và lò sưởi ấm cúng.",
    host: {
      name: "Minh Anh",
      avatar: "https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=200&q=80",
      joinedDate: "2023-01",
      responseRate: "99%",
      isSuperhost: true,
    },
    reviews: [],
  };

  const dealsHubResult = DealsHubSchema.safeParse({
    expiryLabel: "Hết hạn 30/11/2026",
    vouchers: [extendedVoucher],
    campaigns: [validCampaign],
  });
  assert.equal(dealsHubResult.success, true);
  if (dealsHubResult.success) {
    assert.equal(dealsHubResult.data.campaigns[0]?.isActive, true);
  }

  const dealDetailResult = DealDetailSchema.safeParse({
    campaign: validCampaign,
    vouchers: [extendedVoucher],
    properties: [validProperty],
  });
  assert.equal(dealDetailResult.success, true);

  assert.equal(
    DealsHubSchema.safeParse({
      expiryLabel: "Hết hạn 30/11/2026",
      vouchers: [extendedVoucher],
      campaigns: [{ ...validCampaign, theme: "unknown-theme" }],
    }).success,
    false
  );
  assert.equal(
    DealDetailSchema.safeParse({
      campaign: { ...validCampaign, placement: "sidebar" },
      vouchers: [extendedVoucher],
      properties: [validProperty],
    }).success,
    false
  );

  assert.equal(API_ENDPOINTS.deals, "/api/v1/deals");
  assert.equal(API_ENDPOINTS.dealBySlug(" black-friday-2026 "), "/api/v1/deals/black-friday-2026");
  assert.equal(API_ENDPOINTS.dealBySlug("a/b c"), "/api/v1/deals/a%2Fb%20c");
});

test("Phase 5 Activities, Transfers, ServiceBookingIntent, bundle reservations, and endpoints validate cleanly", () => {
  const transferPayload = {
    id: "act-01",
    slug: "xe-rieng-san-bay-lien-khuong-da-lat",
    title: "Xe riêng đón sân bay Liên Khương ↔ Đà Lạt",
    subtitle: "SUV 7 chỗ đón tận sảnh",
    category: "transfer" as const,
    destinationCity: "Đà Lạt",
    province: "Lâm Đồng",
    meetingPoint: "Sân bay Liên Khương",
    durationLabel: "45 phút",
    pricePerUnit: 380_000,
    unitLabel: "chuyến xe",
    rating: 4.96,
    reviewCount: 318,
    images: ["/images/activities/act-01.jpg"],
    highlights: ["Đón tận sảnh"],
    included: ["Xe riêng 7 chỗ"],
    freeCancellation: true,
    instantConfirmation: true,
    slots: [
      {
        id: "slot-dli-morning",
        startTime: "06:00",
        endTime: "12:00",
        period: "morning" as const,
        label: "Sáng (06:00 - 12:00)",
        maxCapacity: 8,
        priceModifier: 0,
      },
    ],
    transferDetails: {
      routeFrom: "Sân bay Liên Khương",
      routeTo: "Đà Lạt",
      vehicleType: "SUV 7 chỗ",
      maxPassengers: 6,
      maxLuggage: 5,
      roundTripAvailable: true,
    },
    isFeatured: true,
    isActive: true,
  };

  assert.equal(TravelActivitySchema.safeParse(transferPayload).success, true);
  assert.equal(TransferServiceSchema.safeParse(transferPayload).success, true);

  assert.equal(
    ActivitiesCatalogResponseSchema.safeParse({
      activities: [transferPayload],
      cities: ["Đà Lạt"],
      categories: ["transfer"],
    }).success,
    true
  );

  assert.equal(
    ActivityDetailResponseSchema.safeParse({
      activity: transferPayload,
      relatedStays: [],
      availableVouchers: [],
    }).success,
    true
  );

  const intentParsed = ServiceBookingIntentSchema.safeParse({
    activityId: "act-01",
    slotId: "slot-dli-morning",
    dateIso: "2026-12-10",
    quantity: 2,
    guestInfo: {
      fullName: "Nguyễn Văn A",
      phone: "0912345678",
      email: "a@luxestay.vn",
    },
    paymentMethod: "hotel",
    promoCode: " welcome150 ",
  });
  assert.equal(intentParsed.success, true);
  if (intentParsed.success) {
    assert.equal(intentParsed.data.promoCode, "WELCOME150");
  }

  assert.equal(
    ActivityBookingSchema.safeParse({
      bookingId: "ACT-123456",
      activityId: "act-01",
      activitySlug: "xe-rieng-san-bay-lien-khuong-da-lat",
      activityTitle: transferPayload.title,
      activityCategory: "transfer",
      activityImage: "/images/activities/act-01.jpg",
      destinationCity: "Đà Lạt",
      slotId: "slot-dli-morning",
      slotLabel: "Sáng (06:00 - 12:00)",
      dateIso: "2026-12-10",
      quantity: 2,
      unitLabel: "chuyến xe",
      unitPrice: 380_000,
      subtotal: 760_000,
      discount: 150_000,
      appliedPromoCode: "WELCOME150",
      total: 610_000,
      guestInfo: {
        fullName: "Nguyễn Văn A",
        phone: "0912345678",
        email: "a@luxestay.vn",
      },
      paymentMethod: "hotel",
      freeCancellation: true,
      status: "confirmed",
      createdAt: "2026-11-25T10:00:00.000Z",
    }).success,
    true
  );

  const bundleIntent = ServerReservationIntentSchema.safeParse({
    propertyId: "stay-01",
    nights: 2,
    guests: { adults: 2, children: 0, rooms: 1 },
    selectedAmenityIds: [],
    selectedActivities: [
      { activityId: "act-01", slotId: "slot-dli-morning", dateIso: "2026-12-10", quantity: 1 },
    ],
    guestInfo: { fullName: "Nguyễn B", phone: "0912345678", email: "b@luxestay.vn" },
    paymentMethod: "momo",
  });
  assert.equal(bundleIntent.success, true);

  assert.equal(API_ENDPOINTS.activities, "/api/v1/activities");
  assert.equal(API_ENDPOINTS.activityBySlug("tour-san-may"), "/api/v1/activities/tour-san-may");
  assert.equal(API_ENDPOINTS.activityBookings, "/api/v1/activities/bookings");
  assert.equal(
    API_ENDPOINTS.cancelActivityBooking("act-999999"),
    "/api/v1/activities/bookings/ACT-999999/cancel"
  );
  assert.equal(
    API_ENDPOINTS.cancelReservationActivityItem("lx-abc123", "item-1"),
    "/api/v1/reservations/LX-ABC123/activities/item-1/cancel"
  );

  // Phase 5B backward-compatible 2-tier taxonomy & specialized detail schemas
  const parsedLegacy = TravelActivitySchema.parse(transferPayload);
  assert.equal(parsedLegacy.hubSection, "tours");
  assert.equal(parsedLegacy.subcategory, "local-workshop");

  const attractionParsed = TravelActivitySchema.safeParse({
    ...transferPayload,
    id: "act-13",
    slug: "ba-na-hills-golden-bridge",
    category: "experience",
    hubSection: "attractions",
    subcategory: "theme-park",
    transferDetails: undefined,
    attractionDetails: {
      openingHours: "08:00 – 17:00 hàng ngày",
      entryMethod: "Quét mã QR vào thẳng cổng cáp treo",
      ageOrHeightNote: "Miễn phí trẻ em dưới 1m",
      venueAddress: "Thôn An Sơn, Hòa Ninh, Hòa Vang, Đà Nẵng",
    },
  });
  assert.equal(attractionParsed.success, true);

  const essentialParsed = TravelActivitySchema.safeParse({
    ...transferPayload,
    id: "act-31",
    slug: "esim-vietnam-4g-5g",
    category: "experience",
    hubSection: "essentials",
    subcategory: "sim-wifi",
    transferDetails: undefined,
    essentialDetails: {
      deliveryMethod: "Gửi mã QR kích hoạt qua Email tức thì",
      validityWindow: "Hiệu lực 30 ngày kể từ ngày mua",
      activationNote: "Hỗ trợ iPhone XS trở lên và các thiết bị Android có eSIM",
    },
  });
  assert.equal(essentialParsed.success, true);

  // Phase 5C backward compatibility defaults & full rich gallery + Know Before You Go schemas
  assert.deepEqual(parsedLegacy.excluded, []);
  assert.deepEqual(parsedLegacy.itinerary, []);
  assert.deepEqual(parsedLegacy.knowBeforeYouGo, []);
  assert.deepEqual(parsedLegacy.suitableFor, []);
  assert.deepEqual(parsedLegacy.languages, ["Tiếng Việt", "Tiếng Anh"]);
  assert.equal(parsedLegacy.howToUse, undefined);
  assert.equal(parsedLegacy.cancellationPolicy, undefined);

  const richPhase5c = TravelActivitySchema.safeParse({
    ...transferPayload,
    id: "act-39",
    slug: "ve-sun-world-ha-long-dragon-park",
    category: "experience",
    hubSection: "attractions",
    subcategory: "theme-park",
    transferDetails: undefined,
    images: [
      "/images/activities/act-39.jpg",
      "/images/activities/act-39-2.jpg",
      "/images/activities/act-39-3.jpg",
    ],
    imageCaptions: [
      "Cáp treo Nữ Hoàng vượt vịnh Hạ Long",
      "Vòng quay Mặt Trời trên đồi Ba Đèo",
      "Khu vui chơi Dragon Park sôi động",
    ],
    excluded: ["Chi phí ăn uống ngoài combo", "Chi phí gửi đồ cá nhân tại tủ khóa"],
    itinerary: [
      {
        timeOrStep: "Bước 1",
        title: "Nhận mã QR điện tử qua Email",
        description: "Hệ thống xuất mã QR ngay sau khi xác nhận đơn đặt vé.",
      },
    ],
    knowBeforeYouGo: [
      {
        category: "dress-code",
        title: "Trang phục thoải mái",
        detail: "Mang giày thể thao nhẹ và mũ chống nắng khi tham quan khu ngoài trời.",
      },
    ],
    howToUse: {
      ticketType: "Vé QR điện tử (không cần in giấy)",
      steps: ["Mở mã QR trong email xác nhận", "Quét thẳng tại cổng kiểm soát ga Đại Dương"],
      arrivalLeadTime: "Có mặt trước giờ đóng cửa ít nhất 90 phút",
      requiredDocuments: "CCCD/Hộ chiếu đối chiếu với nhóm ưu đãi chiều cao trẻ em",
    },
    cancellationPolicy: {
      headline: "Hủy miễn phí hoàn tiền 100% trước 24 giờ",
      refundWindowHours: 24,
      rules: [
        "Hủy trước 24 giờ so với ngày sử dụng: hoàn 100% giá trị đơn.",
        "Hủy trong vòng 24 giờ: không hoàn tiền do mã vé đã xuất với nhà cung cấp.",
      ],
      rescheduleNote: "Hỗ trợ đổi ngày sử dụng miễn phí 1 lần nếu báo trước 24 giờ.",
      weatherNote: "Trường hợp bão/dông cáp treo tạm ngừng vận hành, hoàn 100% hoặc bảo lưu vé.",
    },
    suitableFor: ["Gia đình có trẻ nhỏ", "Nhóm bạn trẻ", "Cặp đôi"],
    languages: ["Tiếng Việt", "Tiếng Anh"],
  });
  assert.equal(richPhase5c.success, true);
});
