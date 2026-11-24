import { test, expect } from "@playwright/test";

test.describe("LuxeStay End-to-End Platform Flows", () => {
  test("E2E-1: Discovery, Locale (VI/EN) & Currency (VND/USD) switching persists across reload", async ({
    page,
  }) => {
    await page.goto("/");

    // Initial catalog loads in Vietnamese / VND (popular sort places top-rated stay-08 6.500.000 ₫ first)
    const firstPrice = page.getByTestId("property-card-price").first();
    await expect(firstPrice).toBeVisible();
    await expect(firstPrice).toContainText("₫");

    // Toggle currency VND -> USD (in vi-VN locale formats as "260 US$")
    await page.getByTestId("currency-toggle").click();
    await expect(page.getByTestId("currency-toggle")).toHaveText("USD");
    await expect(firstPrice).toContainText("260");

    // Toggle language VI -> EN (in en-US locale formats as "$260")
    await page.getByTestId("locale-toggle").click();
    await expect(page.getByTestId("locale-toggle")).toContainText("EN");
    await expect(firstPrice).toContainText("$260");
    await expect(
      page.getByRole("navigation").getByRole("link", { name: "Host Portal" })
    ).toBeVisible();

    // Reload and verify localStorage preferences persist cleanly with zero fallback
    await page.reload();
    await expect(page.getByTestId("currency-toggle")).toHaveText("USD");
    await expect(page.getByTestId("property-card-price").first()).toContainText("$260");
    await expect(
      page.getByRole("navigation").getByRole("link", { name: "Host Portal" })
    ).toBeVisible();

    // Switch back to VI / VND
    await page.getByTestId("currency-toggle").click();
    await page.getByTestId("locale-toggle").click();
    await expect(page.getByTestId("currency-toggle")).toHaveText("VNĐ");
  });

  test("E2E-2: Stay Detail availability calendar, booking, complete stay & Verified Review", async ({
    page,
  }) => {
    await page.goto("/stays/stay-01");

    // Availability calendar loads from live @luxestay/api
    await expect(page.getByText("Lịch phòng trống & giá theo đêm")).toBeVisible();
    await expect(page.getByText("Tổng quỹ phòng: 1 căn nguyên bản")).toBeVisible();

    // Open checkout modal directly from StayDetailView
    await page.getByRole("button", { name: "Đặt phòng ngay" }).click();
    const dialog = page.getByRole("dialog", { name: "Xác nhận đặt phòng" });
    await expect(dialog).toBeVisible();

    // Fill demo guest info, pick pay-at-hotel for instant confirmation, and submit
    await dialog.getByRole("button", { name: /Điền nhanh thông tin mẫu/i }).click();
    await dialog.getByRole("button", { name: /Thanh toán tại chỗ nghỉ/i }).click();
    await dialog.getByRole("button", { name: /Xác nhận đặt phòng ngay/i }).click();

    // BookingSuccessModal appears with authoritative LX-XXXXXX code
    const successDialog = page.getByRole("dialog");
    await expect(successDialog).toBeVisible();
    const bookingIdText = await successDialog
      .locator("text=/LX-[A-F0-9]{6}/")
      .first()
      .textContent();
    expect(bookingIdText).toMatch(/LX-[A-F0-9]{6}/);
    const bookingId = bookingIdText!.trim();

    // Open booking detail page via contact verification link
    await page.goto(
      `/bookings/${encodeURIComponent(bookingId)}?contact=${encodeURIComponent("demo.guest@luxestay.vn")}`
    );
    await expect(page.getByText("Đã xác nhận")).toBeVisible();

    // Complete stay via Sandbox button -> unlocks Verified Review form
    await page.getByRole("button", { name: "Hoàn tất lưu trú" }).click();
    await expect(page.getByText("Hoàn tất lưu trú").first()).toBeVisible();

    const uniqueReview =
      "Trải nghiệm E2E tuyệt vời, săn mây Đà Lạt sáng sớm cực chill và phòng gỗ rất sạch sẽ!";
    await page.locator("textarea").fill(uniqueReview);
    await page.getByRole("button", { name: "Gửi đánh giá xác thực" }).click();
    await expect(
      page.getByText("Cảm ơn bạn! Đánh giá xác thực đã được đăng thành công.")
    ).toBeVisible();

    // Verify review and Verified Stay badge appear on live SSR /stays/stay-01
    await page.goto("/stays/stay-01");
    await expect(page.getByText(uniqueReview)).toBeVisible();
    await expect(page.getByText("Đã xác thực lưu trú").first()).toBeVisible();
  });

  test("E2E-3: Host Portal RBAC gate, Host login, owned listings isolation & availability block", async ({
    page,
  }) => {
    await page.goto("/host");

    // Unauthenticated user is gated cleanly
    await expect(
      page.getByText("Khu vực dành riêng cho Chủ nhà & Quản trị viên")
    ).toBeVisible();

    // Quick-login as built-in Host Demo (host@luxestay.vn)
    await page.getByTestId("quick-login-host").click();
    await expect(page.getByText("Host Portal").first()).toBeVisible();

    // Check Properties tab: Host sees stay-01..stay-06 (6 items), NOT stay-07
    await page.getByTestId("host-tab-properties").click();
    await expect(page.getByText("stay-01 •")).toBeVisible();
    await expect(page.getByText("stay-07 •")).toHaveCount(0);

    // Check Availability tab: block a date on stay-02 and verify live update
    await page.getByTestId("host-tab-availability").click();
    await page.getByTestId("host-avail-property").selectOption("stay-02");
    await page.getByTestId("host-avail-blocked").check();
    await page.getByTestId("host-avail-submit").click();

    await expect(page.getByText(/Đã cập nhật lịch ngày .* cho chỗ nghỉ stay-02/)).toBeVisible();
    await expect(page.getByText("Tạm khóa").first()).toBeVisible();
  });

  test("E2E-4: Promotions Hub on homepage, voucher terms modal, /deals center, and /deals/[slug] checkout promo pre-fill", async ({
    page,
  }) => {
    // 1. Homepage Promotions Hub renders above #properties-section with direct image URLs
    await page.goto("/");
    const promotionsHub = page.getByTestId("promotions-hub");
    const heroBanner = page.getByTestId("campaign-hero-banner");
    const propertiesSection = page.locator("#properties-section");

    await expect(promotionsHub).toBeVisible();
    await expect(heroBanner).toBeVisible();
    await expect(propertiesSection).toBeVisible();

    const hubBox = await promotionsHub.boundingBox();
    const propertiesBox = await propertiesSection.boundingBox();
    expect(hubBox).not.toBeNull();
    expect(propertiesBox).not.toBeNull();
    expect(hubBox!.y).toBeLessThan(propertiesBox!.y);

    const hubImages = promotionsHub.locator("img");
    expect(await hubImages.count()).toBeGreaterThan(0);
    const imageSrcs = await hubImages.evaluateAll((imgs) =>
      imgs.map((img) => img.getAttribute("src") ?? "")
    );
    for (const src of imageSrcs) {
      expect(src).toBeTruthy();
      expect(src).not.toContain("/_next/image");
    }

    // 2. Inspect WELCOME150 terms modal and dismiss cleanly via Escape (OverlayContext)
    await page.getByTestId("voucher-info-WELCOME150").click();
    const termsModal = page.getByTestId("voucher-terms-modal");
    await expect(termsModal).toBeVisible();
    await expect(termsModal).toContainText("WELCOME150");
    await expect(termsModal).toContainText("Đơn tối thiểu");
    await expect(termsModal).toContainText("800.000");

    await page.keyboard.press("Escape");
    await expect(termsModal).toBeHidden();

    // 3. Navigate from campaign card to /deals/bien-he-phu-quoc-nha-trang
    await page.getByTestId("campaign-card-bien-he-phu-quoc-nha-trang").click();
    await expect(page).toHaveURL(/\/deals\/bien-he-phu-quoc-nha-trang$/);
    await expect(page.getByTestId("deal-detail-view")).toBeVisible();

    const matchingStays = page.getByTestId("deal-matching-stays");
    await expect(matchingStays).toBeVisible();
    await expect(matchingStays).toContainText("The Coral Luxury Villa & Sunset Beach");

    // 4. Open checkout on first matched stay -> NEWSTAY250 pre-filled & auto-verified discount
    await matchingStays.getByRole("button", { name: "Đặt phòng ngay" }).first().click();
    const checkoutDialog = page.getByRole("dialog", { name: "Xác nhận đặt phòng" });
    await expect(checkoutDialog).toBeVisible();

    const promoInput = checkoutDialog.locator('input[placeholder*="LUXESTAY250"]');
    await expect(promoInput).toHaveValue("NEWSTAY250");
    await expect(checkoutDialog).toContainText(/Áp dụng mã NEWSTAY250 thành công.*250\.000/);
    await expect(checkoutDialog).toContainText("-250.000");

    await page.keyboard.press("Escape");
    await expect(checkoutDialog).toBeHidden();

    // 5. Verify mixed-property campaign fallback on /deals/san-may-da-lat-sapa
    await page.goto("/deals/san-may-da-lat-sapa");
    await expect(page.getByTestId("deal-detail-view")).toBeVisible();
    await expect(page.getByTestId("deal-matching-stays")).toContainText(
      "Aira Panorama Mountain Retreat & Spa"
    );

    const stay03Promo = page.getByTestId("deal-stay-promo-stay-03");
    await expect(stay03Promo).toBeVisible();
    await expect(stay03Promo).toContainText("WELCOME150");

    await page
      .getByTestId("voucher-card-HOMESTAY10")
      .getByTestId("voucher-select-HOMESTAY10")
      .click();
    await expect(stay03Promo).toContainText("WELCOME150");
    await expect(stay03Promo).toHaveAttribute("data-promo-code", "WELCOME150");

    // 6. Navigate to /deals via Navbar and test audience filter pills
    await page.getByTestId("nav-deals-link").click();
    await expect(page).toHaveURL(/\/deals$/);
    await expect(page.getByTestId("deals-center-view")).toBeVisible();

    await page.getByTestId("deals-filter-new-user").click();
    await expect(page.getByTestId("voucher-card-WELCOME150")).toBeVisible();
    await expect(page.getByTestId("voucher-card-NEWSTAY250")).toBeVisible();
    await expect(page.getByTestId("voucher-card-HOMESTAY10")).toBeVisible();
    await expect(page.getByTestId("voucher-card-VIPRESORT1M")).toBeHidden();

    await page.getByTestId("deals-filter-member").click();
    await expect(page.getByTestId("voucher-card-VIPRESORT1M")).toBeVisible();
    await expect(page.getByTestId("voucher-card-WELCOME150")).toBeHidden();
  });
});
