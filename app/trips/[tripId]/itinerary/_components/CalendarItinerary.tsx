"use client";

import { useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { CATEGORY_META } from "@/lib/categories";
import {
  IconBack,
  IconChevronRight,
  IconMap,
} from "@/components/icons";
import { AddAttractionForm } from "./AddAttractionForm";
import { DayAttractionsList } from "./DayAttractionsList";
import type { Attraction } from "./AttractionRow";
import Link from "next/link";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarItinerary({
  tripId,
  tripStart,
  tripEnd,
  attractions,
  dayCount,
  canEdit,
}: {
  tripId: string;
  tripStart: string;
  tripEnd: string;
  attractions: Attraction[];
  dayCount: number;
  canEdit: boolean;
}) {
  const startDate = useMemo(() => parseISO(tripStart), [tripStart]);
  const endDate = useMemo(() => parseISO(tripEnd), [tripEnd]);
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(startDate));
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  const calendarDays = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(visibleMonth)),
        end: endOfWeek(endOfMonth(visibleMonth)),
      }),
    [visibleMonth]
  );

  const byDay = useMemo(() => {
    const result = new Map<number, Attraction[]>();
    for (const attraction of attractions) {
      if (attraction.dayIndex === null) continue;
      const dayItems = result.get(attraction.dayIndex) ?? [];
      dayItems.push(attraction);
      result.set(attraction.dayIndex, dayItems);
    }
    return result;
  }, [attractions]);

  const selectedDate = addDays(startDate, selectedDayIndex);
  const selectedAttractions = byDay.get(selectedDayIndex) ?? [];
  const firstMonth = startOfMonth(startDate);
  const lastMonth = startOfMonth(endDate);
  const canGoBack = isAfter(visibleMonth, firstMonth);
  const canGoForward = isBefore(visibleMonth, lastMonth);

  return (
    <div className="flex flex-col gap-6">
      <section className="overflow-hidden rounded-[1.75rem] border border-border bg-surface shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <button
            type="button"
            onClick={() => setVisibleMonth((month) => addMonths(month, -1))}
            disabled={!canGoBack}
            aria-label="Previous month"
            className="pressable flex h-10 w-10 items-center justify-center rounded-full border border-border text-foreground-muted disabled:opacity-25"
          >
            <IconBack size={18} />
          </button>
          <div className="text-center">
            <p className="font-mono text-[0.65rem] font-bold tracking-[0.2em] text-foreground-muted uppercase">
              {format(visibleMonth, "yyyy")}
            </p>
            <h2 className="text-2xl font-bold tracking-tight">
              {format(visibleMonth, "MMMM")}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setVisibleMonth((month) => addMonths(month, 1))}
            disabled={!canGoForward}
            aria-label="Next month"
            className="pressable flex h-10 w-10 items-center justify-center rounded-full border border-border text-foreground-muted disabled:opacity-25"
          >
            <IconChevronRight size={18} />
          </button>
        </div>

        <div className="grid grid-cols-7 border-b border-border px-2">
          {WEEKDAYS.map((weekday) => (
            <div
              key={weekday}
              className="py-2 text-center font-mono text-[0.6rem] font-bold tracking-wide text-foreground-muted uppercase"
            >
              {weekday.slice(0, 1)}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 px-2 pb-2">
          {calendarDays.map((date) => {
            const dayIndex = differenceInCalendarDays(date, startDate);
            const isTripDay = dayIndex >= 0 && dayIndex < dayCount;
            const dayAttractions = isTripDay ? byDay.get(dayIndex) ?? [] : [];
            const colors = Array.from(
              new Set(dayAttractions.map((item) => CATEGORY_META[item.category].color))
            ).slice(0, 4);
            const isSelected = isTripDay && isSameDay(date, selectedDate);

            return (
              <button
                key={date.toISOString()}
                type="button"
                disabled={!isTripDay}
                aria-label={
                  isTripDay
                    ? `${format(date, "EEEE, MMMM d")}, ${dayAttractions.length} planned`
                    : format(date, "MMMM d")
                }
                aria-pressed={isSelected}
                onClick={() => setSelectedDayIndex(dayIndex)}
                className={[
                  "relative flex min-h-16 flex-col items-center border-b border-border/70 py-2 transition-colors sm:min-h-20",
                  !isSameMonth(date, visibleMonth)
                    ? "text-foreground-muted/30"
                    : isTripDay
                      ? "text-foreground"
                      : "text-foreground-muted/45",
                  isTripDay ? "hover:bg-surface-muted/60" : "cursor-default",
                ].join(" ")}
              >
                <span
                  className={[
                    "flex h-8 w-8 items-center justify-center rounded-full font-mono text-sm font-bold tabular-nums transition-colors",
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "",
                  ].join(" ")}
                >
                  {format(date, "d")}
                </span>
                {colors.length > 0 && (
                  <span
                    aria-hidden
                    className="mt-auto flex h-1.5 max-w-[80%] overflow-hidden rounded-full"
                  >
                    {colors.map((color) => (
                      <span
                        key={color}
                        className="h-full w-2.5"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-3" aria-live="polite">
        <div className="flex items-center gap-3">
          <span className="font-mono text-3xl leading-none font-light tabular-nums text-foreground-muted">
            {String(selectedDayIndex + 1).padStart(2, "0")}
          </span>
          <div className="flex flex-1 flex-col leading-tight">
            <span className="text-[0.65rem] font-bold tracking-[0.2em] text-foreground-muted uppercase">
              Selected day
            </span>
            <h2 className="text-lg font-bold">{format(selectedDate, "EEEE, MMMM d")}</h2>
          </div>
          {selectedAttractions.some(
            (attraction) => attraction.lat !== null && attraction.lng !== null
          ) && (
            <Link
              href={`/trips/${tripId}/map?day=${selectedDayIndex + 1}`}
              aria-label={`View day ${selectedDayIndex + 1} on map`}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border text-primary"
            >
              <IconMap size={17} />
            </Link>
          )}
        </div>

        <DayAttractionsList
          key={selectedDayIndex}
          tripId={tripId}
          attractions={selectedAttractions}
          dayCount={dayCount}
          canEdit={canEdit}
        />

        {canEdit && (
          <div className="pl-[38px]">
            <AddAttractionForm tripId={tripId} dayIndex={selectedDayIndex} />
          </div>
        )}
      </section>
    </div>
  );
}
