"use client";

import React, { useState } from "react";
import {
  Backpack,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  CloudSun,
  FileCheck2,
  Globe,
  HeartPulse,
  Info,
  Lightbulb,
  MapPin,
  QrCode,
  ShieldAlert,
  ShieldCheck,
  Shirt,
  Sparkles,
  Users,
  XCircle,
} from "lucide-react";
import type { ActivityGoodToKnowCategory, TravelActivity } from "@luxestay/contracts";
import { useLocale } from "@/features/locale/LocaleContext";

const GOOD_TO_KNOW_META: Record<
  ActivityGoodToKnowCategory,
  {
    Icon: React.ComponentType<{ className?: string }>;
    badgeClass: string;
  }
> = {
  "dress-code": { Icon: Shirt, badgeClass: "bg-violet-50 text-violet-700 border-violet-200/70" },
  weather: { Icon: CloudSun, badgeClass: "bg-sky-50 text-sky-700 border-sky-200/70" },
  "health-age": { Icon: HeartPulse, badgeClass: "bg-rose-50 text-rose-700 border-rose-200/70" },
  bring: { Icon: Backpack, badgeClass: "bg-amber-50 text-amber-800 border-amber-200/70" },
  policy: { Icon: ShieldAlert, badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200/70" },
  tip: { Icon: Lightbulb, badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200/70" },
};

type AccordionPanelId = "important-notes" | "how-to-use" | "cancellation" | "meeting-support";

export function ActivityQuickFactsStrip({ activity }: { activity: TravelActivity }) {
  const { locale, t } = useLocale();
  const hasQuickFacts =
    (activity.suitableFor?.length ?? 0) > 0 || (activity.languages?.length ?? 0) > 0;

  if (!hasQuickFacts) return null;

  return (
    <div
      data-testid="activity-quick-facts"
      className="flex flex-wrap items-center gap-2 pt-1 text-xs"
    >
      {activity.suitableFor.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50/80 text-emerald-800 border border-emerald-200/70 font-semibold"
        >
          <Users className="w-3 h-3 text-emerald-600 shrink-0" />
          {tag}
        </span>
      ))}
      {activity.languages.length > 0 && (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold">
          <Globe className="w-3 h-3 text-slate-500 shrink-0" />
          {t("activities.detail.languages")}: {activity.languages.join(", ")}
        </span>
      )}
      {activity.freeCancellation && (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200/70 font-semibold">
          <ShieldCheck className="w-3 h-3 text-teal-600 shrink-0" />
          {locale === "en" ? "Free 24h cancellation" : "Hủy miễn phí trước 24h"}
        </span>
      )}
    </div>
  );
}

export function ActivitySectionJumpBar({ hasItinerary }: { hasItinerary: boolean }) {
  const { t } = useLocale();
  const links = [
    { href: "#overview", label: t("activities.jump.overview") },
    ...(hasItinerary ? [{ href: "#itinerary", label: t("activities.jump.itinerary") }] : []),
    { href: "#inclusions", label: t("activities.jump.inclusions") },
    { href: "#good-to-know", label: t("activities.jump.goodToKnow") },
  ];

  return (
    <nav
      aria-label="Activity sections"
      data-testid="activity-jump-bar"
      className="sticky top-[68px] z-20 -mx-1 px-1 py-2 bg-slate-50/90 backdrop-blur-md border-b border-slate-200/70 max-w-full overflow-x-auto"
    >
      <div className="flex items-center gap-2 min-w-max">
        {links.map((item, index) => (
          <a
            key={item.href}
            href={item.href}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors whitespace-nowrap ${
              index === 0
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-white text-slate-700 border border-slate-200 hover:border-emerald-300 hover:text-emerald-700"
            }`}
          >
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

export function ActivityRichDetailsSections({ activity }: { activity: TravelActivity }) {
  const { locale, t } = useLocale();
  // Smart Accordion: default open the 2 most critical traveler decision sections
  const [openPanels, setOpenPanels] = useState<Record<AccordionPanelId, boolean>>({
    "important-notes": true,
    "how-to-use": true,
    cancellation: false,
    "meeting-support": false,
  });

  const togglePanel = (id: AccordionPanelId) => {
    setOpenPanels((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6 w-full min-w-0">
      {/* Highlights */}
      <section
        id="overview"
        className="scroll-mt-32 bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-3"
      >
        <h2 className="font-bold text-slate-900 text-base sm:text-lg flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-600 shrink-0" />
          {locale === "en" ? "Experience Highlights" : "Điểm nổi bật"}
        </h2>
        <ul className="space-y-2.5 text-sm text-slate-600">
          {activity.highlights.map((item) => (
            <li key={item} className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Itinerary / Step-by-step Timeline */}
      {activity.itinerary.length > 0 && (
        <section
          id="itinerary"
          data-testid="activity-itinerary-section"
          className="scroll-mt-32 bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-4"
        >
          <h2 className="font-bold text-slate-900 text-base sm:text-lg flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-emerald-600 shrink-0" />
            {t("activities.detail.itinerary")}
          </h2>
          <ol className="relative border-l-2 border-emerald-200 ml-3 space-y-5 pl-6">
            {activity.itinerary.map((step, idx) => (
              <li key={`${step.timeOrStep}-${idx}`} className="relative">
                <span className="absolute -left-[33px] top-0.5 w-4 h-4 rounded-full bg-emerald-600 ring-4 ring-emerald-50" />
                <div className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold mb-1">
                  {step.timeOrStep}
                </div>
                <h3 className="text-sm font-bold text-slate-900">{step.title}</h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-0.5 leading-relaxed">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Included & Excluded Side-by-Side */}
      <section
        id="inclusions"
        data-testid="activity-inclusions-section"
        className="scroll-mt-32 grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        <div className="bg-white rounded-3xl border border-emerald-200/80 p-5 space-y-3">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            {t("activities.detail.included")}
          </h2>
          <ul className="space-y-2 text-sm text-slate-600">
            {activity.included.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div
          data-testid="activity-excluded-card"
          className="bg-white rounded-3xl border border-slate-200 p-5 space-y-3"
        >
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
            {t("activities.detail.excluded")}
          </h2>
          <ul className="space-y-2 text-sm text-slate-600">
            {(activity.excluded.length > 0
              ? activity.excluded
              : ["Chi phí cá nhân ngoài chương trình tiêu chuẩn"]
            ).map((item) => (
              <li key={item} className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* "Điều bạn cũng nên biết" — Smart 4-Panel Accordion */}
      <section
        id="good-to-know"
        data-testid="activity-good-to-know-section"
        className="scroll-mt-32 bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden"
      >
        <div className="p-5 sm:p-6 bg-gradient-to-r from-amber-50/70 via-white to-emerald-50/50 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <Info className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                {t("activities.detail.goodToKnow")}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                {t("activities.detail.goodToKnowSubtitle")}
              </p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {/* Panel 1: Important Notes Before You Go (Default Open) */}
          {activity.knowBeforeYouGo.length > 0 && (
            <div>
              <button
                type="button"
                data-testid="accordion-trigger-important-notes"
                aria-expanded={openPanels["important-notes"]}
                onClick={() => togglePanel("important-notes")}
                className="w-full px-5 sm:px-6 py-4 flex items-center justify-between gap-3 text-left hover:bg-slate-50/80 transition-colors cursor-pointer"
              >
                <span className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-600 shrink-0" />
                  {t("activities.detail.importantNotes")}
                  <span className="text-xs font-semibold text-slate-500">
                    ({activity.knowBeforeYouGo.length})
                  </span>
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200 ${
                    openPanels["important-notes"] ? "rotate-180" : ""
                  }`}
                />
              </button>
              {openPanels["important-notes"] && (
                <div
                  data-testid="accordion-panel-important-notes"
                  className="px-5 sm:px-6 pb-5 grid grid-cols-1 sm:grid-cols-2 gap-3"
                >
                  {activity.knowBeforeYouGo.map((item) => {
                    const meta = GOOD_TO_KNOW_META[item.category] ?? GOOD_TO_KNOW_META.tip;
                    const Icon = meta.Icon;
                    return (
                      <div
                        key={item.title}
                        className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5 space-y-1.5"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-7 h-7 rounded-xl border flex items-center justify-center shrink-0 ${meta.badgeClass}`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </span>
                          <span className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                            {item.title}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">{item.detail}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Panel 2: How to Use Ticket / Voucher (Default Open) */}
          {activity.howToUse && (
            <div>
              <button
                type="button"
                data-testid="accordion-trigger-how-to-use"
                aria-expanded={openPanels["how-to-use"]}
                onClick={() => togglePanel("how-to-use")}
                className="w-full px-5 sm:px-6 py-4 flex items-center justify-between gap-3 text-left hover:bg-slate-50/80 transition-colors cursor-pointer"
              >
                <span className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-emerald-600 shrink-0" />
                  {t("activities.detail.howToUse")}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200 ${
                    openPanels["how-to-use"] ? "rotate-180" : ""
                  }`}
                />
              </button>
              {openPanels["how-to-use"] && (
                <div
                  data-testid="accordion-panel-how-to-use"
                  className="px-5 sm:px-6 pb-5 space-y-3"
                >
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200/70">
                    <FileCheck2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    {activity.howToUse.ticketType}
                  </div>
                  <ol className="space-y-2 text-xs sm:text-sm text-slate-700">
                    {activity.howToUse.steps.map((step, idx) => (
                      <li key={step} className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-100 text-xs">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <span className="font-bold text-slate-500 block">
                        {t("activities.detail.arrivalLeadTime")}
                      </span>
                      <span className="text-slate-800 font-semibold mt-0.5 block">
                        {activity.howToUse.arrivalLeadTime}
                      </span>
                    </div>
                    {activity.howToUse.requiredDocuments && (
                      <div className="rounded-xl bg-slate-50 p-3">
                        <span className="font-bold text-slate-500 block">
                          {t("activities.detail.requiredDocuments")}
                        </span>
                        <span className="text-slate-800 font-semibold mt-0.5 block">
                          {activity.howToUse.requiredDocuments}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Panel 3: Cancellation & Reschedule Policy */}
          {activity.cancellationPolicy && (
            <div>
              <button
                type="button"
                data-testid="accordion-trigger-cancellation"
                aria-expanded={openPanels.cancellation}
                onClick={() => togglePanel("cancellation")}
                className="w-full px-5 sm:px-6 py-4 flex items-center justify-between gap-3 text-left hover:bg-slate-50/80 transition-colors cursor-pointer"
              >
                <span className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
                  {t("activities.detail.cancellationPolicy")}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200 ${
                    openPanels.cancellation ? "rotate-180" : ""
                  }`}
                />
              </button>
              {openPanels.cancellation && (
                <div
                  data-testid="accordion-panel-cancellation"
                  className="px-5 sm:px-6 pb-5 space-y-3 text-xs sm:text-sm text-slate-700"
                >
                  <div className="rounded-2xl bg-teal-50/80 border border-teal-200/70 px-4 py-2.5 text-teal-900 font-bold text-xs sm:text-sm">
                    {activity.cancellationPolicy.headline}
                  </div>
                  <ul className="space-y-1.5">
                    {activity.cancellationPolicy.rules.map((rule) => (
                      <li key={rule} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                        <span>{rule}</span>
                      </li>
                    ))}
                  </ul>
                  {activity.cancellationPolicy.rescheduleNote && (
                    <p className="text-xs text-slate-600 bg-slate-50 rounded-xl p-3">
                      <strong>{locale === "en" ? "Rescheduling:" : "Đổi lịch:"}</strong>{" "}
                      {activity.cancellationPolicy.rescheduleNote}
                    </p>
                  )}
                  {activity.cancellationPolicy.weatherNote && (
                    <p className="text-xs text-slate-600 bg-sky-50/70 rounded-xl p-3">
                      <strong>{locale === "en" ? "Weather guarantee:" : "Đảm bảo thời tiết:"}</strong>{" "}
                      {activity.cancellationPolicy.weatherNote}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Panel 4: Meeting Point & Support */}
          <div>
            <button
              type="button"
              data-testid="accordion-trigger-meeting-support"
              aria-expanded={openPanels["meeting-support"]}
              onClick={() => togglePanel("meeting-support")}
              className="w-full px-5 sm:px-6 py-4 flex items-center justify-between gap-3 text-left hover:bg-slate-50/80 transition-colors cursor-pointer"
            >
              <span className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                {t("activities.detail.meetingAndSupport")}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200 ${
                  openPanels["meeting-support"] ? "rotate-180" : ""
                }`}
              />
            </button>
            {openPanels["meeting-support"] && (
              <div
                data-testid="accordion-panel-meeting-support"
                className="px-5 sm:px-6 pb-5 space-y-2.5 text-xs sm:text-sm text-slate-700"
              >
                <div className="rounded-2xl bg-slate-50 p-3.5 space-y-1">
                  <span className="text-xs font-bold text-slate-500 block">
                    {locale === "en" ? "Meeting / Pickup Point" : "Điểm tập trung / Đón khách"}
                  </span>
                  <span className="font-semibold text-slate-900 block">
                    {activity.meetingPoint}
                  </span>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-slate-600 pt-1">
                  <span>
                    <strong>{t("activities.detail.languages")}:</strong>{" "}
                    {activity.languages.join(", ")}
                  </span>
                  {activity.suitableFor.length > 0 && (
                    <span>
                      <strong>{t("activities.detail.suitableFor")}:</strong>{" "}
                      {activity.suitableFor.join(" • ")}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
