import type { CurrencyCode, LocaleCode } from "@luxestay/contracts";

export const DEFAULT_USD_EXCHANGE_RATE = 25_000;

export function convertVndToCurrency(
  amountVnd: number,
  currency: CurrencyCode,
  usdRate: number = DEFAULT_USD_EXCHANGE_RATE
): number {
  const safeAmount = Number.isFinite(amountVnd) ? amountVnd : 0;
  if (currency === "VND") {
    return Math.round(safeAmount);
  }
  const safeRate = usdRate > 0 ? usdRate : DEFAULT_USD_EXCHANGE_RATE;
  return Math.round((safeAmount / safeRate) * 100) / 100;
}

export function formatMoney(
  amountVnd: number,
  currency: CurrencyCode = "VND",
  locale: LocaleCode = "vi",
  usdRate: number = DEFAULT_USD_EXCHANGE_RATE
): string {
  if (currency === "USD") {
    const usd = convertVndToCurrency(amountVnd, "USD", usdRate);
    const isWhole = Math.abs(usd - Math.round(usd)) < 0.005;
    return new Intl.NumberFormat(locale === "en" ? "en-US" : "vi-VN", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: isWhole ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(usd);
  }

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Math.round(Number.isFinite(amountVnd) ? amountVnd : 0));
}

export const TRANSLATIONS = {
  vi: {
    "nav.explore": "Khám phá",
    "nav.destinations": "Điểm đến",
    "nav.deals": "Ưu đãi Hot",
    "nav.activities": "Trải nghiệm & Đưa đón",
    "nav.lookupBooking": "Tra cứu đơn",
    "nav.hostPortal": "Cổng Chủ nhà",
    "nav.favorites": "Yêu thích",
    "nav.login": "Đăng nhập",
    "nav.logout": "Đăng xuất",
    "nav.myBookings": "Đơn đặt phòng của tôi",
    "nav.role.guest": "Thành viên",
    "nav.role.host": "Chủ nhà",
    "nav.role.admin": "Quản trị viên",
    "hero.badge": "Bộ sưu tập nghỉ dưỡng tuyển chọn 2026",
    "hero.titleLine1": "Chạm vào bình yên,",
    "hero.titleLine2": "đặt kỳ nghỉ chuẩn gu Việt",
    "hero.subtitle":
      "Khám phá homestay săn mây Đà Lạt, biệt thự biển Phú Quốc và resort 5 sao với giá minh bạch, tiện ích chi tiết và chống đặt trùng theo thời gian thực.",
    "search.destination": "Điểm đến",
    "search.destinationPlaceholder": "Đà Lạt, Phú Quốc, Sa Pa...",
    "search.checkIn": "Nhận phòng",
    "search.checkOut": "Trả phòng",
    "search.guests": "Khách & Phòng",
    "search.button": "Tìm phòng",
    "catalog.resultsCount": "Tìm thấy {count} chỗ nghỉ phù hợp",
    "catalog.filterButton": "Bộ lọc nâng cao",
    "catalog.resetFilters": "Xóa tất cả bộ lọc",
    "catalog.perNight": "/đêm",
    "catalog.bookNow": "Đặt phòng ngay",
    "catalog.freeCancel": "Hủy miễn phí",
    "catalog.verifiedReview": "Đã xác thực lưu trú",
    "catalog.showingCount": "Đang hiển thị {shown} / {total} chỗ nghỉ",
    "catalog.loadMore": "Xem thêm {count} chỗ nghỉ",
    "catalog.collapse": "Thu gọn danh sách",
    "host.title": "Cổng Chủ nhà & Quản trị LuxeStay",
    "host.subtitle": "Quản lý chỗ nghỉ, lịch phòng trống, giá đặc biệt, đơn khách và báo cáo doanh thu.",
    "host.tab.analytics": "Tổng quan & Doanh thu",
    "host.tab.properties": "Chỗ nghỉ ({count})",
    "host.tab.availability": "Lịch phòng & Giá đặc biệt",
    "host.tab.bookings": "Đơn đặt phòng ({count})",
    "host.addProperty": "Thêm chỗ nghỉ mới",
    "host.accessDeniedTitle": "Khu vực dành riêng cho Chủ nhà & Quản trị viên",
    "host.accessDeniedDesc":
      "Vui lòng đăng nhập bằng tài khoản Host hoặc Admin để quản lý chỗ nghỉ, lịch trống và doanh thu.",
    "host.totalRevenue": "Tổng doanh thu hiệu lực",
    "host.confirmedBookings": "Đơn xác nhận & hoàn tất",
    "host.avgOrderValue": "Giá trị trung bình / đơn",
    "host.managedProperties": "Chỗ nghỉ đang vận hành",
    "footer.tagline":
      "Nền tảng đặt phòng khách sạn, villa và homestay nghỉ dưỡng cao cấp tại Việt Nam với tiện ích minh bạch và xác nhận tức thì.",
    "footer.copyright": "© 2026 LuxeStay Vietnam. Bảo lưu mọi quyền.",
    "deals.newUserTitle": "Mã giảm giá cho bạn mới",
    "deals.newUserSubtitle":
      "Ưu đãi chào mừng dành riêng cho lần đặt phòng đầu tiên trên LuxeStay",
    "deals.ongoingTitle": "Ưu đãi đang diễn ra",
    "deals.viewAll": "Xem tất cả ưu đãi",
    "deals.copy": "Sao chép",
    "deals.copied": "Đã sao chép",
    "deals.viewDeal": "Xem ưu đãi",
    "deals.termsApply": "Điều khoản áp dụng",
    "deals.endsIn": "Ưu đãi sắp kết thúc",
    "deals.days": "Ngày",
    "deals.hours": "Giờ",
    "deals.minutes": "Phút",
    "deals.seconds": "Giây",
    "deals.modalTitle": "Chi tiết mã ưu đãi",
    "deals.minOrder": "Đơn tối thiểu",
    "deals.expiry": "Hạn sử dụng",
    "deals.scope": "Phạm vi áp dụng",
    "deals.conditions": "Điều kiện & thể lệ",
    "deals.filterAll": "Tất cả",
    "deals.filterNewUser": "Bạn mới",
    "deals.filterMember": "Thành viên",
    "deals.backToDeals": "Tất cả ưu đãi",
    "deals.matchingStays": "Chỗ nghỉ đang áp dụng ưu đãi",
    "deals.matchingStaysSubtitle":
      "Chọn chỗ nghỉ bên dưới để tự động đính kèm mã ưu đãi khi đặt phòng",
    "deals.autoApplySelected": "Đang chọn áp sẵn khi đặt phòng",
    "deals.selectToApply": "Chọn dùng mã này",
    "deals.noMatchingStays": "Hiện chưa có chỗ nghỉ phù hợp trong chiến dịch này.",
    "deals.featuredCode": "Mã nổi bật",
    "activities.title": "Trải nghiệm, Tour & Đưa đón Sân bay",
    "activities.subtitle":
      "Đặt xe riêng đón sân bay, tour bản địa tuyển chọn và trải nghiệm văn hóa — đặt lẻ hoặc ghép gói cùng chuyến lưu trú",
    "activities.category.all": "Tất cả dịch vụ",
    "activities.category.transfer": "Đưa đón sân bay",
    "activities.category.tour": "Tour nổi bật",
    "activities.category.experience": "Trải nghiệm bản địa",
    "activities.category.wellness": "Wellness & Thảo mộc",
    "activities.category.culinary": "Ẩm thực",
    "activities.period.all": "Mọi khung giờ",
    "activities.period.morning": "Buổi sáng",
    "activities.period.afternoon": "Buổi chiều",
    "activities.period.evening": "Buổi tối",
    "activities.period.flexible": "Linh hoạt 24/7",
    "activities.bookNow": "Đặt dịch vụ ngay",
    "activities.addToStay": "Thêm vào chuyến đi",
    "activities.addedToStay": "Đã thêm vào gói",
    "activities.cancelItem": "Hủy dịch vụ này",
    "activities.crossSellTitle": "Thêm Đưa đón sân bay & Trải nghiệm tại {city}",
    "activities.crossSellSubtitle":
      "Ghép gói cùng đơn đặt phòng để thanh toán 1 lần, áp chung mã ưu đãi và hủy riêng từng dịch vụ khi cần",
  },
  en: {
    "nav.explore": "Explore",
    "nav.destinations": "Destinations",
    "nav.deals": "Hot Deals",
    "nav.activities": "Activities & Transfers",
    "nav.lookupBooking": "My Bookings",
    "nav.hostPortal": "Host Portal",
    "nav.favorites": "Saved",
    "nav.login": "Sign In",
    "nav.logout": "Sign Out",
    "nav.myBookings": "My Reservations",
    "nav.role.guest": "Member",
    "nav.role.host": "Host",
    "nav.role.admin": "Admin",
    "hero.badge": "Curated Vietnam Stays Collection 2026",
    "hero.titleLine1": "Escape to serenity,",
    "hero.titleLine2": "book your signature stay",
    "hero.subtitle":
      "Discover Dalat cloud-hunting villas, Phu Quoc beachfront resorts, and boutique retreats with transparent seasonal pricing and real-time anti-double-booking.",
    "search.destination": "Destination",
    "search.destinationPlaceholder": "Dalat, Phu Quoc, Sapa...",
    "search.checkIn": "Check-in",
    "search.checkOut": "Check-out",
    "search.guests": "Guests & Rooms",
    "search.button": "Search",
    "catalog.resultsCount": "Found {count} matching stays",
    "catalog.filterButton": "Filters",
    "catalog.resetFilters": "Reset all filters",
    "catalog.perNight": "/night",
    "catalog.bookNow": "Book Now",
    "catalog.freeCancel": "Free cancellation",
    "catalog.verifiedReview": "Verified Stay",
    "catalog.showingCount": "Showing {shown} of {total} stays",
    "catalog.loadMore": "Show {count} more stays",
    "catalog.collapse": "Show fewer stays",
    "host.title": "LuxeStay Host & Admin Portal",
    "host.subtitle": "Manage listings, daily availability overrides, guest reservations, and revenue analytics.",
    "host.tab.analytics": "Revenue & Analytics",
    "host.tab.properties": "Listings ({count})",
    "host.tab.availability": "Availability & Pricing",
    "host.tab.bookings": "Guest Bookings ({count})",
    "host.addProperty": "Add New Listing",
    "host.accessDeniedTitle": "Host & Admin Access Required",
    "host.accessDeniedDesc":
      "Please sign in with a Host or Admin account to manage properties, availability overrides, and revenue analytics.",
    "host.totalRevenue": "Effective Revenue",
    "host.confirmedBookings": "Confirmed & Completed",
    "host.avgOrderValue": "Average Order Value",
    "host.managedProperties": "Active Listings",
    "footer.tagline":
      "Vietnam's curated luxury hotel, villa, and boutique homestay booking platform with transparent amenities and instant confirmation.",
    "footer.copyright": "© 2026 LuxeStay Vietnam. All rights reserved.",
    "deals.newUserTitle": "New User Coupons",
    "deals.newUserSubtitle":
      "Exclusive welcome offers for your very first stay on LuxeStay",
    "deals.ongoingTitle": "Ongoing Deals",
    "deals.viewAll": "See all deals",
    "deals.copy": "Copy",
    "deals.copied": "Copied",
    "deals.viewDeal": "View deal",
    "deals.termsApply": "Terms & conditions apply",
    "deals.endsIn": "Ends in",
    "deals.days": "Days",
    "deals.hours": "Hours",
    "deals.minutes": "Mins",
    "deals.seconds": "Secs",
    "deals.modalTitle": "Coupon Details",
    "deals.minOrder": "Minimum spend",
    "deals.expiry": "Valid until",
    "deals.scope": "Applicable scope",
    "deals.conditions": "Terms & conditions",
    "deals.filterAll": "All",
    "deals.filterNewUser": "New Users",
    "deals.filterMember": "Members",
    "deals.backToDeals": "All deals",
    "deals.matchingStays": "Eligible stays for this deal",
    "deals.matchingStaysSubtitle":
      "Select a stay below to auto-apply your chosen promo code at checkout",
    "deals.autoApplySelected": "Selected for auto-apply",
    "deals.selectToApply": "Select this code",
    "deals.noMatchingStays": "No eligible stays currently match this campaign.",
    "deals.featuredCode": "Featured code",
    "activities.title": "Activities, Tours & Airport Transfers",
    "activities.subtitle":
      "Book private airport transfers, curated day tours, and local workshops standalone or bundled with your stay",
    "activities.category.all": "All Services",
    "activities.category.transfer": "Airport Transfers",
    "activities.category.tour": "Signature Tours",
    "activities.category.experience": "Local Experiences",
    "activities.category.wellness": "Wellness & Spa",
    "activities.category.culinary": "Culinary",
    "activities.period.all": "Any Time",
    "activities.period.morning": "Morning",
    "activities.period.afternoon": "Afternoon",
    "activities.period.evening": "Evening",
    "activities.period.flexible": "Flexible 24/7",
    "activities.bookNow": "Book Experience",
    "activities.addToStay": "Add to stay bundle",
    "activities.addedToStay": "Added to bundle",
    "activities.cancelItem": "Cancel this service",
    "activities.crossSellTitle": "Add Airport Transfers & Local Experiences in {city}",
    "activities.crossSellSubtitle":
      "Bundle with your stay for single checkout, shared promo savings, and independent per-item cancellation",
  },
} as const;

export type TranslationKey = keyof typeof TRANSLATIONS.vi;

export function translate(
  locale: LocaleCode,
  key: TranslationKey,
  params?: Record<string, string | number>
): string {
  const dict = TRANSLATIONS[locale] ?? TRANSLATIONS.vi;
  let text: string = dict[key] ?? TRANSLATIONS.vi[key] ?? key;
  if (params) {
    for (const [paramKey, val] of Object.entries(params)) {
      text = text.replaceAll(`{${paramKey}}`, String(val));
    }
  }
  return text;
}
