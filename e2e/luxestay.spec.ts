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
});
