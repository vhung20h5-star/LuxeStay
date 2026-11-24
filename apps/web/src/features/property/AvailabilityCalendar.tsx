"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import type { AvailabilityDay, PropertyAvailabilityData } from "@luxestay/contracts";
import { enumerateStayDates, formatVND, parseBookingDateToIso } from "@luxestay/domain";
import { useBookingSession } from "@/features/booking/BookingContext";
import { isAbortError } from "@/shared/ports/errors";

export interface AvailabilityCalendarProps {
  propertyId: string;
  selectedCheckIn: string;
  nights: number;
  rooms?: number;
  onSelectCheckIn: (isoDate: string) => void;
  compact?: boolean;
}

const WEEKDAY_SHORT_VI = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"] as const;
const PAGE_SIZE = 14;

function formatCompactPrice(vnd: number): string {
  if (vnd >= 1_000_000) {
    const millions = vnd / 1_000_000;
    const formatted = Number.isInteger(millions)
      ? String(millions)
      : millions.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
    return `${formatted}tr`;
  }
  return `${Math.round(vnd / 1000)}k`;
}

function getDayMeta(isoDate: string): { weekday: string; dayMonth: string } {
  const [y, m, d] = isoDate.split("-").map(Number);
  const utc = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  return {
    weekday: WEEKDAY_SHORT_VI[utc.getUTCDay()] ?? "",
    dayMonth: `${String(d || 1).padStart(2, "0")}/${String(m || 1).padStart(2, "0")}`,
  };
}

function AvailabilityCalendarInner({
  propertyId,
  selectedCheckIn,
  nights,
  rooms = 1,
  onSelectCheckIn,
  compact = false,
}: AvailabilityCalendarProps) {
  const { propertyExperience } = useBookingSession();
  const [calendar, setCalendar] = useState<PropertyAvailabilityData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    propertyExperience
      .getAvailability(propertyId, undefined, { signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return;
        setCalendar(data);
        setLoadError(null);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted || isAbortError(err)) return;
        setLoadError("Không thể tải lịch phòng trống lúc này.");
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [propertyExperience, propertyId]);

  const selectedStayDates = useMemo(() => {
    const isoStart = parseBookingDateToIso(selectedCheckIn);
    if (!isoStart) return new Set<string>();
    return new Set(enumerateStayDates(isoStart, nights));
  }, [selectedCheckIn, nights]);

  const conflictDays = useMemo(() => {
    if (!calendar || selectedStayDates.size === 0) return [];
    const byDate = new Map<string, AvailabilityDay>(
      calendar.days.map((d) => [d.date, d])
    );
    const conflicts: AvailabilityDay[] = [];
    for (const dateIso of selectedStayDates) {
      const day = byDate.get(dateIso);
      if (day && (day.isBlocked || day.remainingUnits < rooms)) {
        conflicts.push(day);
      }
    }
    return conflicts;
  }, [calendar, rooms, selectedStayDates]);

  const totalPages = calendar ? Math.max(1, Math.ceil(calendar.days.length / PAGE_SIZE)) : 1;
  const safePage = Math.min(page, totalPages - 1);
  const visibleDays = calendar
    ? calendar.days.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)
    : [];

  return (
    <div
      className={`rounded-3xl bg-white border border-slate-200/80 ${
        compact ? "p-4 space-y-3" : "p-6 space-y-4"
      }`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <CalendarDays className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              Lịch phòng trống &amp; giá theo đêm
            </h3>
            <p className="text-[11px] text-slate-500">
              Bấm chọn ngày nhận phòng •{" "}
              {calendar
                ? `Tổng quỹ phòng: ${calendar.inventoryCount} ${
                    calendar.inventoryCount > 1 ? "phòng" : "căn nguyên bản"
                  }`
                : "Đang cập nhật tồn kho thực tế..."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0 || isLoading}
            aria-label="14 ngày trước"
            className="w-8 h-8 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-[11px] font-bold text-slate-500 px-1.5">
            {safePage + 1}/{totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={safePage >= totalPages - 1 || isLoading}
            aria-label="14 ngày tiếp theo"
            className="w-8 h-8 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
          Ngày đã chọn ({nights} đêm)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          Cuối tuần (+20%)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
          Ngày lễ (+30%)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
          Hết phòng / Tạm khóa
        </span>
      </div>

      {/* Conflict Alert */}
      {conflictDays.length > 0 && (
        <div
          role="alert"
          className="p-3 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800"
        >
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Khoảng ngày đang chọn không còn đủ phòng trống: </span>
            <span>
              {conflictDays
                .map((d) => {
                  const meta = getDayMeta(d.date);
                  return `${meta.dayMonth} (${d.isBlocked ? "Tạm khóa" : "Hết phòng"})`;
                })
                .join(", ")}
              . Vui lòng chọn ngày nhận phòng khác bên dưới.
            </span>
          </div>
        </div>
      )}

      {/* Calendar Grid */}
      {isLoading ? (
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
          {Array.from({ length: PAGE_SIZE }).map((_, idx) => (
            <div
              key={idx}
              className="h-16 rounded-2xl bg-slate-100 animate-pulse border border-slate-200/60"
            />
          ))}
        </div>
      ) : loadError ? (
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
          {loadError}
        </div>
      ) : (
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
          {visibleDays.map((day) => {
            const meta = getDayMeta(day.date);
            const isSelected = selectedStayDates.has(day.date);
            const isStart = parseBookingDateToIso(selectedCheckIn) === day.date;
            const disabled = day.isBlocked || day.remainingUnits < rooms;
            const priceLabel = formatCompactPrice(day.effectivePrice);

            const reasonBadge =
              day.priceReason === "holiday"
                ? { text: "Lễ", cls: "bg-rose-100 text-rose-700" }
                : day.priceReason === "weekend"
                  ? { text: "+20%", cls: "bg-amber-100 text-amber-800" }
                  : day.priceReason === "override"
                    ? { text: "Đặc biệt", cls: "bg-sky-100 text-sky-700" }
                    : null;

            return (
              <button
                key={day.date}
                type="button"
                disabled={disabled}
                onClick={() => onSelectCheckIn(day.date)}
                title={`${meta.weekday} ${day.date} — ${formatVND(day.effectivePrice)} (${
                  day.isBlocked
                    ? "Tạm khóa"
                    : day.remainingUnits > 0
                      ? `Còn ${day.remainingUnits}/${day.totalUnits} phòng`
                      : "Hết phòng"
                })`}
                className={`relative flex flex-col items-center justify-between p-2 rounded-2xl border text-center transition-all min-h-[72px] ${
                  disabled
                    ? "bg-slate-100/80 border-slate-200/70 text-slate-400 cursor-not-allowed line-through decoration-slate-300"
                    : isStart
                      ? "bg-emerald-600 border-emerald-700 text-white shadow-md shadow-emerald-600/25 ring-2 ring-emerald-500/30"
                      : isSelected
                        ? "bg-emerald-50 border-emerald-400 text-emerald-900"
                        : "bg-white border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 text-slate-800"
                }`}
              >
                <div className="flex items-center justify-between w-full text-[10px] font-bold">
                  <span className={isStart ? "text-emerald-100" : "text-slate-400"}>
                    {meta.weekday}
                  </span>
                  {reasonBadge && !disabled && (
                    <span
                      className={`px-1 py-0.2 rounded text-[9px] font-extrabold ${
                        isStart ? "bg-white/20 text-white" : reasonBadge.cls
                      }`}
                    >
                      {reasonBadge.text}
                    </span>
                  )}
                </div>

                <div className="text-xs font-black tracking-tight">{meta.dayMonth}</div>

                <div
                  className={`text-[10px] font-bold truncate max-w-full ${
                    disabled
                      ? "text-slate-400 no-underline"
                      : isStart
                        ? "text-emerald-50"
                        : day.priceReason === "holiday"
                          ? "text-rose-600"
                          : day.priceReason === "weekend"
                            ? "text-amber-700"
                            : "text-emerald-700"
                  }`}
                >
                  {day.isBlocked
                    ? "Tạm khóa"
                    : day.remainingUnits < rooms
                      ? "Hết phòng"
                      : priceLabel}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {!compact && calendar && (
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 pt-1">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>
            Giá tự động cập nhật theo đêm cuối tuần (T6–T7 +20%) và dịp lễ lớn Việt Nam (+30%).
            Phòng được giữ chỗ an toàn chống đặt trùng ngay khi xác nhận.
          </span>
        </div>
      )}
    </div>
  );
}

export function AvailabilityCalendar(props: AvailabilityCalendarProps) {
  return <AvailabilityCalendarInner key={props.propertyId} {...props} />;
}
