"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AlertCircle,
  BarChart3,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  Lock,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  TrendingUp,
} from "lucide-react";
import type {
  BookingDetails,
  CategoryId,
  CreateHostPropertyInput,
  HostAnalyticsData,
  Property,
  PropertyType,
  ReservationStatus,
} from "@luxestay/contracts";
import { formatIsoDate, isHostOrAdmin } from "@luxestay/domain";
import { useAuth } from "@/features/auth/AuthContext";
import { useBookingSession, useCatalog } from "@/features/booking/BookingContext";
import { useLocale } from "@/features/locale/LocaleContext";
import { AvailabilityCalendar } from "@/features/property/AvailabilityCalendar";
import type { DataMode } from "@/shared/config/env";
import { HttpApiError, isAbortError } from "@/shared/ports/errors";
import { createHostPortForMode } from "@/shared/ports/hostPort";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";

type HostTab = "analytics" | "properties" | "availability" | "bookings";

const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: "homestay", label: "Homestay" },
  { value: "villa", label: "Villa biệt thự" },
  { value: "hotel", label: "Khách sạn" },
  { value: "resort", label: "Resort" },
  { value: "glamping", label: "Glamping" },
];

const CATEGORIES: { value: Exclude<CategoryId, "all">; label: string }[] = [
  { value: "mountain-view", label: "View núi / Săn mây" },
  { value: "beachfront", label: "Sát biển" },
  { value: "pine-forest", label: "Rừng thông" },
  { value: "infinity-pool", label: "Hồ bơi vô cực" },
  { value: "luxury-resort", label: "Resort 5 sao" },
  { value: "vintage-homestay", label: "Homestay Vintage" },
  { value: "ecolodge", label: "Ecolodge" },
  { value: "city-center", label: "Trung tâm phố" },
];

const QUICK_AMENITIES = [
  { id: "high-speed-wifi", label: "Wi-Fi tốc độ cao" },
  { id: "in-room-breakfast", label: "Bữa sáng tại phòng" },
  { id: "garden-bbq", label: "Tiệc nướng BBQ sân vườn" },
  { id: "airport-shuttle", label: "Xe đưa đón sân bay" },
  { id: "herbal-spa", label: "Spa trị liệu thảo mộc" },
  { id: "outdoor-wooden-tub", label: "Bồn tắm gỗ ngoài trời" },
];

const DEFAULT_DEMO_IMAGE =
  "https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=1200&q=80";

const BOOKING_STATUS_PILL: Record<ReservationStatus, { label: string; cls: string }> = {
  confirmed: { label: "Đã xác nhận", cls: "bg-emerald-100 text-emerald-800" },
  completed: { label: "Hoàn tất lưu trú", cls: "bg-indigo-100 text-indigo-800" },
  pending_payment: { label: "Chờ thanh toán", cls: "bg-amber-100 text-amber-800" },
  payment_failed: { label: "Lỗi thanh toán", cls: "bg-rose-100 text-rose-800" },
  expired: { label: "Hết hạn", cls: "bg-slate-200 text-slate-700" },
  cancelled: { label: "Đã hủy", cls: "bg-rose-100 text-rose-700" },
};

export interface HostPortalViewProps {
  dataMode: DataMode;
  apiBaseUrl: string;
}

export function HostPortalView({ dataMode, apiBaseUrl }: HostPortalViewProps) {
  const { user, isLoading: isAuthLoading, setAuthModalOpen, login } = useAuth();
  const { properties: catalogProperties } = useCatalog();
  const { completeReservation } = useBookingSession();
  const { t, formatPrice } = useLocale();

  const hostPort = useMemo(
    () =>
      createHostPortForMode({
        mode: dataMode,
        apiBaseUrl,
        properties: catalogProperties,
      }),
    [apiBaseUrl, catalogProperties, dataMode]
  );

  const [activeTab, setActiveTab] = useState<HostTab>("analytics");
  const [refreshKey, setRefreshKey] = useState(0);
  const [managedProperties, setManagedProperties] = useState<readonly Property[]>([]);
  const [hostBookings, setHostBookings] = useState<readonly BookingDetails[]>([]);
  const [analytics, setAnalytics] = useState<HostAnalyticsData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionBanner, setActionBanner] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  // Quick demo login state
  const [demoLoggingIn, setDemoLoggingIn] = useState<"host" | "admin" | null>(null);

  // Property create/edit form state
  const [editorMode, setEditorMode] = useState<"closed" | "create" | "edit">("closed");
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);
  const [propTitle, setPropTitle] = useState("");
  const [propSubtitle, setPropSubtitle] = useState("");
  const [propType, setPropType] = useState<PropertyType>("homestay");
  const [propCategory, setPropCategory] = useState<Exclude<CategoryId, "all">>("pine-forest");
  const [propCity, setPropCity] = useState("Đà Lạt");
  const [propProvince, setPropProvince] = useState("Lâm Đồng");
  const [propAddress, setPropAddress] = useState("Đường Hoàng Hoa Thám, Phường 10");
  const [propImage, setPropImage] = useState(DEFAULT_DEMO_IMAGE);
  const [propPrice, setPropPrice] = useState("1500000");
  const [propInventory, setPropInventory] = useState("1");
  const [propMaxGuests, setPropMaxGuests] = useState("4");
  const [propBedrooms, setPropBedrooms] = useState("2");
  const [propDescription, setPropDescription] = useState(
    "Không gian nghỉ dưỡng yên tĩnh, thiết kế hiện đại hòa quyện thiên nhiên, đầy đủ tiện nghi cao cấp cho gia đình và cặp đôi."
  );
  const [propFreeCancel, setPropFreeCancel] = useState(true);
  const [propBreakfast, setPropBreakfast] = useState(false);
  const [propAmenities, setPropAmenities] = useState<string[]>(["high-speed-wifi", "garden-bbq"]);
  const [isSavingProp, setIsSavingProp] = useState(false);

  // Availability override state
  const [selectedAvailPropertyId, setSelectedAvailPropertyId] = useState<string>("");
  const [availDate, setAvailDate] = useState<string>(() => {
    const tomorrow = new Date(Date.now() + 86_400_000);
    return formatIsoDate(tomorrow);
  });
  const [availBlocked, setAvailBlocked] = useState(false);
  const [availOverridePrice, setAvailOverridePrice] = useState("");
  const [availNote, setAvailNote] = useState("");
  const [isSavingAvail, setIsSavingAvail] = useState(false);
  const [calendarVersion, setCalendarVersion] = useState(0);

  // Completing a guest stay
  const [completingBookingId, setCompletingBookingId] = useState<string | null>(null);

  const canAccessPortal = Boolean(user && isHostOrAdmin(user.role));

  useEffect(() => {
    if (!canAccessPortal) return;
    const controller = new AbortController();

    Promise.all([
      hostPort.listProperties({ signal: controller.signal }),
      hostPort.listReservations(undefined, { signal: controller.signal }),
      hostPort.getAnalytics({ signal: controller.signal }),
    ])
      .then(([props, bookings, stats]) => {
        if (controller.signal.aborted) return;
        setManagedProperties(props);
        setHostBookings(bookings);
        setAnalytics(stats);
        setSelectedAvailPropertyId((prev) =>
          prev && props.some((p) => p.id === prev) ? prev : (props[0]?.id ?? "")
        );
        setLoadError(null);
        setIsLoadingData(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted || isAbortError(err)) return;
        setLoadError(
          err instanceof HttpApiError
            ? err.message
            : "Không thể tải dữ liệu Cổng Chủ nhà lúc này."
        );
        setIsLoadingData(false);
      });

    return () => controller.abort();
  }, [canAccessPortal, hostPort, refreshKey]);

  const triggerRefresh = useCallback(() => {
    setIsLoadingData(true);
    setRefreshKey((k) => k + 1);
  }, []);

  const handleQuickDemoLogin = async (kind: "host" | "admin") => {
    setDemoLoggingIn(kind);
    setActionBanner(null);
    try {
      await login({
        email: kind === "host" ? "host@luxestay.vn" : "admin@luxestay.vn",
        password: kind === "host" ? "host1234" : "admin1234",
      });
      setIsLoadingData(true);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setActionBanner({
        tone: "error",
        message:
          err instanceof HttpApiError
            ? err.message
            : "Không thể đăng nhập tài khoản thử nghiệm.",
      });
    } finally {
      setDemoLoggingIn(null);
    }
  };

  const openCreateForm = () => {
    setEditorMode("create");
    setEditingPropertyId(null);
    setPropTitle("");
    setPropSubtitle("");
    setPropType("homestay");
    setPropCategory("pine-forest");
    setPropCity("Đà Lạt");
    setPropProvince("Lâm Đồng");
    setPropAddress("Đường Hoàng Hoa Thám, Phường 10");
    setPropImage(DEFAULT_DEMO_IMAGE);
    setPropPrice("1500000");
    setPropInventory("1");
    setPropMaxGuests("4");
    setPropBedrooms("2");
    setPropDescription(
      "Không gian nghỉ dưỡng yên tĩnh, thiết kế hiện đại hòa quyện thiên nhiên, đầy đủ tiện nghi cao cấp cho gia đình và cặp đôi."
    );
    setPropFreeCancel(true);
    setPropBreakfast(false);
    setPropAmenities(["high-speed-wifi", "garden-bbq"]);
    setActionBanner(null);
  };

  const openEditForm = (prop: Property) => {
    setEditorMode("edit");
    setEditingPropertyId(prop.id);
    setPropTitle(prop.title);
    setPropSubtitle(prop.subtitle);
    setPropType(prop.propertyType);
    setPropCategory(prop.category === "all" ? "pine-forest" : prop.category);
    setPropCity(prop.location.city);
    setPropProvince(prop.location.province);
    setPropAddress(prop.location.address);
    setPropImage(prop.images[0] ?? DEFAULT_DEMO_IMAGE);
    setPropPrice(String(prop.pricePerNight));
    setPropInventory(String(prop.inventoryCount));
    setPropMaxGuests(String(prop.maxGuests));
    setPropBedrooms(String(prop.bedrooms));
    setPropDescription(prop.description);
    setPropFreeCancel(Boolean(prop.freeCancellation));
    setPropBreakfast(Boolean(prop.breakfastIncluded));
    setPropAmenities(prop.resortAmenities.map((a) => a.amenityId));
    setActionBanner(null);
  };

  const handleSaveProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProp(true);
    setActionBanner(null);

    try {
      const pricePerNight = Math.max(100_000, Math.round(Number(propPrice) || 1_000_000));
      const inventoryCount = Math.max(1, Math.floor(Number(propInventory) || 1));
      const maxGuests = Math.max(1, Math.floor(Number(propMaxGuests) || 2));
      const bedrooms = Math.max(1, Math.floor(Number(propBedrooms) || 1));

      if (editorMode === "create") {
        const payload: CreateHostPropertyInput = {
          title: propTitle.trim(),
          subtitle: propSubtitle.trim(),
          propertyType: propType,
          category: propCategory,
          location: {
            city: propCity.trim(),
            province: propProvince.trim(),
            address: propAddress.trim(),
            distanceToCenter: "Cách trung tâm 2.5 km",
          },
          images: [propImage.trim() || DEFAULT_DEMO_IMAGE],
          pricePerNight,
          inventoryCount,
          maxGuests,
          bedrooms,
          beds: bedrooms,
          bathrooms: Math.max(1, bedrooms),
          freeCancellation: propFreeCancel,
          breakfastIncluded: propBreakfast,
          description: propDescription.trim(),
          amenityIds: propAmenities,
        };
        const created = await hostPort.createProperty(payload);
        setActionBanner({
          tone: "success",
          message: `Đã tạo thành công chỗ nghỉ "${created.title}" (${created.id}).`,
        });
      } else if (editorMode === "edit" && editingPropertyId) {
        const updated = await hostPort.updateProperty(editingPropertyId, {
          title: propTitle.trim(),
          subtitle: propSubtitle.trim(),
          propertyType: propType,
          category: propCategory,
          pricePerNight,
          inventoryCount,
          maxGuests,
          bedrooms,
          freeCancellation: propFreeCancel,
          breakfastIncluded: propBreakfast,
          description: propDescription.trim(),
          amenityIds: propAmenities,
        });
        setActionBanner({
          tone: "success",
          message: `Đã cập nhật chỗ nghỉ "${updated.title}".`,
        });
      }

      setEditorMode("closed");
      setEditingPropertyId(null);
      triggerRefresh();
    } catch (err) {
      setActionBanner({
        tone: "error",
        message:
          err instanceof HttpApiError
            ? err.message
            : "Không thể lưu thông tin chỗ nghỉ. Vui lòng kiểm tra lại dữ liệu.",
      });
    } finally {
      setIsSavingProp(false);
    }
  };

  const handleDeleteProperty = async (prop: Property) => {
    setActionBanner(null);
    try {
      await hostPort.deleteProperty(prop.id);
      setActionBanner({
        tone: "success",
        message: `Đã xóa chỗ nghỉ "${prop.title}" khỏi hệ thống.`,
      });
      triggerRefresh();
    } catch (err) {
      setActionBanner({
        tone: "error",
        message:
          err instanceof HttpApiError
            ? err.message
            : "Không thể xóa chỗ nghỉ lúc này.",
      });
    }
  };

  const handleSaveAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAvailPropertyId || !availDate) return;
    setIsSavingAvail(true);
    setActionBanner(null);

    try {
      const parsedOverride = availOverridePrice.trim()
        ? Math.max(0, Math.round(Number(availOverridePrice)))
        : null;
      await hostPort.upsertAvailability(selectedAvailPropertyId, {
        dates: [
          {
            date: availDate,
            isBlocked: availBlocked,
            overridePrice: parsedOverride,
            note: availNote.trim() || null,
          },
        ],
      });
      setCalendarVersion((v) => v + 1);
      setActionBanner({
        tone: "success",
        message: `Đã cập nhật lịch ngày ${availDate} cho chỗ nghỉ ${selectedAvailPropertyId}.`,
      });
    } catch (err) {
      setActionBanner({
        tone: "error",
        message:
          err instanceof HttpApiError
            ? err.message
            : "Không thể cập nhật lịch phòng lúc này.",
      });
    } finally {
      setIsSavingAvail(false);
    }
  };

  const handleCompleteGuestBooking = async (bookingId: string) => {
    setCompletingBookingId(bookingId);
    setActionBanner(null);
    try {
      await completeReservation(bookingId);
      setActionBanner({
        tone: "success",
        message: `Đã đánh dấu hoàn tất lưu trú cho đơn ${bookingId}. Khách đã có thể gửi đánh giá xác thực.`,
      });
      triggerRefresh();
    } catch (err) {
      setActionBanner({
        tone: "error",
        message:
          err instanceof HttpApiError
            ? err.message
            : "Không thể cập nhật trạng thái hoàn tất cho đơn này.",
      });
    } finally {
      setCompletingBookingId(null);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
      </div>
    );
  }

  if (!canAccessPortal) {
    return (
      <div className="min-h-[75vh] bg-slate-50 py-12 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-xl mx-auto bg-white rounded-3xl border border-slate-200/80 shadow-xl p-8 text-center space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-slate-900">
              {t("host.accessDeniedTitle")}
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              {t("host.accessDeniedDesc")}
            </p>
            {user && (
              <p className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 inline-block mt-2">
                Bạn đang đăng nhập với vai trò <strong>{user.role}</strong> ({user.email}).
              </p>
            )}
          </div>

          {actionBanner && (
            <div
              role="alert"
              className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800 flex items-center justify-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{actionBanner.message}</span>
            </div>
          )}

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs space-y-2">
            <div className="font-bold text-slate-800">Tài khoản Demo RBAC dựng sẵn:</div>
            <div className="flex items-center justify-between gap-2 text-slate-600">
              <span>
                <strong>Host</strong> (quản lý stay-01..stay-06):{" "}
                <code className="font-mono text-emerald-700">host@luxestay.vn</code> /{" "}
                <code className="font-mono">host1234</code>
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 text-slate-600">
              <span>
                <strong>Admin</strong> (toàn hệ thống 12 chỗ nghỉ):{" "}
                <code className="font-mono text-indigo-700">admin@luxestay.vn</code> /{" "}
                <code className="font-mono">admin1234</code>
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              type="button"
              variant="primary"
              isLoading={demoLoggingIn === "host"}
              onClick={() => handleQuickDemoLogin("host")}
              className="flex-1 justify-center font-bold"
              data-testid="quick-login-host"
            >
              Đăng nhập nhanh Host Demo
            </Button>
            <Button
              type="button"
              variant="outline"
              isLoading={demoLoggingIn === "admin"}
              onClick={() => handleQuickDemoLogin("admin")}
              className="flex-1 justify-center font-bold border-indigo-200 text-indigo-700 hover:bg-indigo-50"
              data-testid="quick-login-admin"
            >
              Đăng nhập Admin Demo
            </Button>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              className="text-xs font-semibold text-slate-500 hover:text-emerald-700 underline"
            >
              Hoặc đăng nhập bằng tài khoản khác
            </button>
          </div>
        </div>
      </div>
    );
  }

  const maxMonthlyRev = Math.max(
    1,
    ...(analytics?.monthlyRevenue.map((m) => m.revenue) ?? [1])
  );

  return (
    <div className="min-h-screen bg-slate-50 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-teal-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
                <ShieldCheck className="w-3.5 h-3.5" />
                {user?.role === "admin" ? "Admin Portal (Toàn hệ thống)" : "Host Portal"}
              </span>
              <span className="text-xs text-slate-300">{user?.email}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              {t("host.title")}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              {t("host.subtitle")}
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={triggerRefresh}
              isLoading={isLoadingData}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <RefreshCw className="w-4 h-4 mr-1.5" />
              Làm mới
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => {
                setActiveTab("properties");
                openCreateForm();
              }}
              className="font-bold"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              {t("host.addProperty")}
            </Button>
          </div>
        </div>

        {/* Feedback Banner */}
        {(actionBanner || loadError) && (
          <div
            role="status"
            className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-3 ${
              loadError || actionBanner?.tone === "error"
                ? "bg-rose-50 border-rose-200 text-rose-800"
                : "bg-emerald-50 border-emerald-200 text-emerald-900"
            }`}
          >
            <div className="flex items-center gap-2">
              {loadError || actionBanner?.tone === "error" ? (
                <AlertCircle className="w-4 h-4 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              )}
              <span>{loadError ?? actionBanner?.message}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setActionBanner(null);
                setLoadError(null);
              }}
              className="text-[11px] underline shrink-0"
            >
              Đóng
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 bg-white p-2 rounded-2xl border border-slate-200/80 shadow-xs">
          {(
            [
              { id: "analytics", label: t("host.tab.analytics"), icon: BarChart3 },
              {
                id: "properties",
                label: t("host.tab.properties", { count: managedProperties.length }),
                icon: Building2,
              },
              { id: "availability", label: t("host.tab.availability"), icon: CalendarClock },
              {
                id: "bookings",
                label: t("host.tab.bookings", { count: hostBookings.length }),
                icon: ClipboardList,
              },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                data-testid={`host-tab-${tab.id}`}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  active
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: ANALYTICS */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-1">
                <span className="text-xs font-semibold text-slate-500">
                  {t("host.totalRevenue")}
                </span>
                <div className="text-2xl font-black text-emerald-700">
                  {formatPrice(analytics?.totalRevenue ?? 0)}
                </div>
                <span className="text-[11px] text-slate-400">
                  Hoàn tất: {formatPrice(analytics?.completedRevenue ?? 0)}
                </span>
              </div>

              <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-1">
                <span className="text-xs font-semibold text-slate-500">
                  {t("host.confirmedBookings")}
                </span>
                <div className="text-2xl font-black text-slate-900">
                  {(analytics?.confirmedBookings ?? 0) + (analytics?.completedBookings ?? 0)}
                </div>
                <span className="text-[11px] text-slate-400">
                  Chờ TT: {analytics?.pendingBookings ?? 0} • Hủy: {analytics?.cancelledBookings ?? 0}
                </span>
              </div>

              <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-1">
                <span className="text-xs font-semibold text-slate-500">
                  {t("host.avgOrderValue")}
                </span>
                <div className="text-2xl font-black text-slate-900">
                  {formatPrice(analytics?.averageOrderValue ?? 0)}
                </div>
                <span className="text-[11px] text-slate-400">Trên các đơn đã thanh toán</span>
              </div>

              <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-1">
                <span className="text-xs font-semibold text-slate-500">
                  {t("host.managedProperties")}
                </span>
                <div className="text-2xl font-black text-slate-900">
                  {analytics?.totalProperties ?? managedProperties.length}
                </div>
                <span className="text-[11px] text-slate-400">
                  Tổng quỹ phòng:{" "}
                  {managedProperties.reduce((sum, p) => sum + p.inventoryCount, 0)} phòng/căn
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Monthly Revenue Bar Chart */}
              <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200/80 space-y-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  <h2 className="text-base font-bold text-slate-900">Doanh thu theo tháng</h2>
                </div>
                {analytics && analytics.monthlyRevenue.length > 0 ? (
                  <div className="space-y-3">
                    {analytics.monthlyRevenue.map((row) => {
                      const pct = Math.max(8, Math.round((row.revenue / maxMonthlyRev) * 100));
                      return (
                        <div key={row.month} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-mono font-bold text-slate-700">{row.month}</span>
                            <span className="font-bold text-emerald-700">
                              {formatPrice(row.revenue)} ({row.bookingsCount} đơn)
                            </span>
                          </div>
                          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-6 text-center">
                    Chưa có doanh thu phát sinh trong kỳ. Tạo đơn đặt phòng để xem biểu đồ cập nhật theo thời gian thực.
                  </p>
                )}
              </div>

              {/* Property Breakdown Table */}
              <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200/80 space-y-4 overflow-x-auto">
                <h2 className="text-base font-bold text-slate-900">Hiệu suất theo chỗ nghỉ</h2>
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px]">
                      <th className="py-2 pr-3">Chỗ nghỉ</th>
                      <th className="py-2 px-3 text-right">Số đơn</th>
                      <th className="py-2 px-3 text-right">Đêm bán</th>
                      <th className="py-2 pl-3 text-right">Doanh thu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(analytics?.propertyBreakdown ?? []).map((row) => (
                      <tr key={row.propertyId}>
                        <td className="py-2.5 pr-3">
                          <div className="font-bold text-slate-900 line-clamp-1">{row.title}</div>
                          <div className="text-[11px] text-slate-400">{row.city}</div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-slate-700">
                          {row.bookingsCount}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-slate-700">
                          {row.occupancyNights}
                        </td>
                        <td className="py-2.5 pl-3 text-right font-bold text-emerald-700">
                          {formatPrice(row.totalRevenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PROPERTIES CRUD */}
        {activeTab === "properties" && (
          <div className="space-y-6">
            {editorMode !== "closed" && (
              <form
                onSubmit={handleSaveProperty}
                className="bg-white rounded-3xl p-6 border-2 border-emerald-200 shadow-md space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-slate-900">
                    {editorMode === "create"
                      ? "Tạo chỗ nghỉ mới"
                      : `Chỉnh sửa chỗ nghỉ (${editingPropertyId})`}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setEditorMode("closed")}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                  >
                    Hủy
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Tên chỗ nghỉ *"
                    value={propTitle}
                    onChange={(e) => setPropTitle(e.target.value)}
                    placeholder="Ví dụ: Pine Hill Wooden Villa Đà Lạt"
                    required
                  />
                  <Input
                    label="Mô tả ngắn *"
                    value={propSubtitle}
                    onChange={(e) => setPropSubtitle(e.target.value)}
                    placeholder="Biệt thự gỗ view rừng thông đón bình minh"
                    required
                  />

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Loại hình
                    </label>
                    <select
                      value={propType}
                      onChange={(e) => setPropType(e.target.value as PropertyType)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
                    >
                      {PROPERTY_TYPES.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Danh mục trải nghiệm
                    </label>
                    <select
                      value={propCategory}
                      onChange={(e) =>
                        setPropCategory(e.target.value as Exclude<CategoryId, "all">)
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
                    >
                      {CATEGORIES.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {editorMode === "create" && (
                    <>
                      <Input
                        label="Thành phố *"
                        value={propCity}
                        onChange={(e) => setPropCity(e.target.value)}
                        required
                      />
                      <Input
                        label="Tỉnh / Thành *"
                        value={propProvince}
                        onChange={(e) => setPropProvince(e.target.value)}
                        required
                      />
                      <Input
                        label="Địa chỉ *"
                        value={propAddress}
                        onChange={(e) => setPropAddress(e.target.value)}
                        required
                      />
                      <Input
                        label="URL ảnh đại diện *"
                        value={propImage}
                        onChange={(e) => setPropImage(e.target.value)}
                        required
                      />
                    </>
                  )}

                  <Input
                    label="Giá chuẩn / đêm (VNĐ) *"
                    type="number"
                    min={100000}
                    step={50000}
                    value={propPrice}
                    onChange={(e) => setPropPrice(e.target.value)}
                    required
                  />
                  <Input
                    label="Số lượng phòng / căn (Inventory) *"
                    type="number"
                    min={1}
                    max={100}
                    value={propInventory}
                    onChange={(e) => setPropInventory(e.target.value)}
                    required
                  />
                  <Input
                    label="Số khách tối đa *"
                    type="number"
                    min={1}
                    max={30}
                    value={propMaxGuests}
                    onChange={(e) => setPropMaxGuests(e.target.value)}
                    required
                  />
                  <Input
                    label="Số phòng ngủ *"
                    type="number"
                    min={1}
                    max={20}
                    value={propBedrooms}
                    onChange={(e) => setPropBedrooms(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Mô tả chi tiết *
                  </label>
                  <textarea
                    rows={3}
                    value={propDescription}
                    onChange={(e) => setPropDescription(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-900"
                    required
                  />
                </div>

                <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-700">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={propFreeCancel}
                      onChange={(e) => setPropFreeCancel(e.target.checked)}
                    />
                    Hủy phòng miễn phí
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={propBreakfast}
                      onChange={(e) => setPropBreakfast(e.target.checked)}
                    />
                    Bao gồm bữa sáng
                  </label>
                </div>

                <div className="space-y-2">
                  <span className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Tiện ích tiêu biểu
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_AMENITIES.map((am) => {
                      const active = propAmenities.includes(am.id);
                      return (
                        <button
                          key={am.id}
                          type="button"
                          onClick={() =>
                            setPropAmenities((prev) =>
                              prev.includes(am.id)
                                ? prev.filter((id) => id !== am.id)
                                : [...prev, am.id]
                            )
                          }
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                            active
                              ? "bg-emerald-600 text-white border-emerald-600"
                              : "bg-slate-50 text-slate-700 border-slate-200 hover:border-emerald-400"
                          }`}
                        >
                          {am.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditorMode("closed")}
                  >
                    Hủy
                  </Button>
                  <Button type="submit" variant="primary" isLoading={isSavingProp}>
                    {editorMode === "create" ? "Đăng chỗ nghỉ" : "Lưu thay đổi"}
                  </Button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {managedProperties.map((prop) => (
                <div
                  key={prop.id}
                  className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs flex flex-col"
                >
                  <div className="relative h-40 bg-slate-100">
                    <Image
                      src={prop.images[0] ?? DEFAULT_DEMO_IMAGE}
                      alt={prop.title}
                      fill
                      className="object-cover"
                    />
                    <span className="absolute top-3 left-3 text-[10px] font-bold bg-slate-900/75 text-white px-2.5 py-1 rounded-full">
                      {prop.id} • {prop.inventoryCount} phòng/căn
                    </span>
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="text-[11px] font-semibold text-emerald-700">
                        {prop.location.city} • {prop.propertyType}
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 line-clamp-1 mt-0.5">
                        {prop.title}
                      </h3>
                      <div className="text-base font-black text-slate-900 mt-1 flex items-baseline gap-1 whitespace-nowrap">
                        <span>{formatPrice(prop.pricePerNight)}</span>
                        <span className="text-xs font-normal text-slate-400 whitespace-nowrap shrink-0">
                          {t("catalog.perNight")}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => openEditForm(prop)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-emerald-50 text-xs font-bold text-slate-700 hover:text-emerald-700 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Sửa
                      </button>
                      <Link
                        href={`/stays/${prop.id}`}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600"
                        title="Xem trang chỗ nghỉ"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDeleteProperty(prop)}
                        className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600"
                        title="Xóa chỗ nghỉ"
                        aria-label={`Xóa ${prop.title}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: AVAILABILITY & OVERRIDES */}
        {activeTab === "availability" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <form
              onSubmit={handleSaveAvailability}
              className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200/80 space-y-4"
            >
              <h2 className="text-base font-bold text-slate-900">
                Khóa ngày &amp; Ghi đè giá đặc biệt
              </h2>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Chọn chỗ nghỉ
                </label>
                <select
                  value={selectedAvailPropertyId}
                  onChange={(e) => setSelectedAvailPropertyId(e.target.value)}
                  data-testid="host-avail-property"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
                >
                  {managedProperties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.id})
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Ngày áp dụng (YYYY-MM-DD)"
                type="date"
                value={availDate}
                onChange={(e) => setAvailDate(e.target.value)}
                data-testid="host-avail-date"
                required
              />

              <label className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer text-xs font-semibold text-slate-800">
                <input
                  type="checkbox"
                  checked={availBlocked}
                  onChange={(e) => setAvailBlocked(e.target.checked)}
                  data-testid="host-avail-blocked"
                />
                <span>Khóa ngày này (Tạm ngừng nhận đặt phòng / Bảo trì)</span>
              </label>

              <Input
                label="Giá ghi đè riêng (VNĐ — để trống nếu dùng giá chuẩn/mùa)"
                type="number"
                min={0}
                step={50000}
                value={availOverridePrice}
                onChange={(e) => setAvailOverridePrice(e.target.value)}
                placeholder="Ví dụ: 2500000"
                data-testid="host-avail-price"
              />

              <Input
                label="Ghi chú nội bộ (Tùy chọn)"
                value={availNote}
                onChange={(e) => setAvailNote(e.target.value)}
                placeholder="Ví dụ: Bảo trì hồ bơi, Tết Nguyên Đán..."
              />

              <Button
                type="submit"
                variant="primary"
                isLoading={isSavingAvail}
                className="w-full justify-center font-bold"
                data-testid="host-avail-submit"
              >
                Lưu cấu hình lịch phòng
              </Button>
            </form>

            <div className="lg:col-span-7">
              {selectedAvailPropertyId && (
                <AvailabilityCalendar
                  key={`${selectedAvailPropertyId}-${calendarVersion}`}
                  propertyId={selectedAvailPropertyId}
                  selectedCheckIn={availDate}
                  nights={1}
                  onSelectCheckIn={(isoDate) => setAvailDate(isoDate)}
                />
              )}
            </div>
          </div>
        )}

        {/* TAB 4: GUEST BOOKINGS */}
        {activeTab === "bookings" && (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900">
              Danh sách đơn đặt phòng khách hàng ({hostBookings.length})
            </h2>

            {hostBookings.length === 0 ? (
              <p className="text-xs text-slate-500 py-8 text-center">
                Chưa có đơn đặt phòng nào thuộc các chỗ nghỉ bạn quản lý.
              </p>
            ) : (
              <div className="space-y-3">
                {hostBookings.map((booking) => {
                  const statusMeta =
                    BOOKING_STATUS_PILL[booking.status] ?? BOOKING_STATUS_PILL.confirmed;
                  return (
                    <div
                      key={booking.bookingId}
                      className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-black text-emerald-700">
                            {booking.bookingId}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusMeta.cls}`}
                          >
                            {statusMeta.label}
                          </span>
                        </div>
                        <div className="font-bold text-slate-900 truncate">
                          {booking.property.title}
                        </div>
                        <div className="text-slate-500">
                          {booking.guestInfo.fullName} ({booking.guestInfo.phone}) •{" "}
                          {booking.checkIn} → {booking.checkOut} ({booking.nights} đêm)
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <div className="text-sm font-black text-slate-900">
                            {formatPrice(booking.pricing.total)}
                          </div>
                          <div className="text-[10px] text-slate-400 uppercase">
                            {booking.paymentMethod}
                          </div>
                        </div>
                        {booking.status === "confirmed" && booking.bookingId && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            isLoading={completingBookingId === booking.bookingId}
                            onClick={() => handleCompleteGuestBooking(booking.bookingId!)}
                            className="border-indigo-300 text-indigo-700 hover:bg-indigo-50 font-bold"
                          >
                            Hoàn tất lưu trú
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
