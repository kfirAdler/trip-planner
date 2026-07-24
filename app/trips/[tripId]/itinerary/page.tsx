import Link from "next/link";
import { addDays, differenceInCalendarDays, format } from "date-fns";
import { requireTripAccess } from "@/lib/trip-access";
import { prisma } from "@/lib/prisma";
import {
  IconCalendar,
  IconChevronDown,
  IconList,
  IconMap,
} from "@/components/icons";
import { AddAttractionForm } from "./_components/AddAttractionForm";
import { CalendarItinerary } from "./_components/CalendarItinerary";
import { DayAttractionsList } from "./_components/DayAttractionsList";

export default async function ItineraryPage({
  params,
  searchParams,
}: {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { tripId } = await params;
  const { view } = await searchParams;
  const { trip, member } = await requireTripAccess(tripId, "VIEWER");
  const canEdit = member.role !== "VIEWER";
  const isCalendarView = view === "calendar";

  const dayCount = differenceInCalendarDays(trip.endDate, trip.startDate) + 1;

  // Places added from the Stats tab start unscheduled (dayIndex null) until
  // linked to a day, so they're excluded here — they simply don't show up
  // in the day-by-day itinerary until then.
  const attractions = await prisma.attraction.findMany({
    where: { tripId, dayIndex: { not: null } },
    orderBy: [{ dayIndex: "asc" }, { position: "asc" }],
  });

  const byDay = new Map<number, typeof attractions>();
  for (const attraction of attractions) {
    const dayIndex = attraction.dayIndex as number;
    const list = byDay.get(dayIndex) ?? [];
    list.push(attraction);
    byDay.set(dayIndex, list);
  }

  return (
    <div className="flex flex-1 flex-col gap-8 px-6 pt-[calc(env(safe-area-inset-top)+2rem)]">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Itinerary</h1>
        <div
          className="flex rounded-full border border-border bg-surface p-1 shadow-[var(--shadow-card)]"
          aria-label="Itinerary view"
        >
          <Link
            href={`/trips/${tripId}/itinerary`}
            aria-label="List view"
            aria-current={!isCalendarView ? "page" : undefined}
            className={[
              "flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-bold transition-colors",
              !isCalendarView
                ? "bg-primary text-primary-foreground"
                : "text-foreground-muted",
            ].join(" ")}
          >
            <IconList size={15} />
            List
          </Link>
          <Link
            href={`/trips/${tripId}/itinerary?view=calendar`}
            aria-label="Calendar view"
            aria-current={isCalendarView ? "page" : undefined}
            className={[
              "flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-bold transition-colors",
              isCalendarView
                ? "bg-primary text-primary-foreground"
                : "text-foreground-muted",
            ].join(" ")}
          >
            <IconCalendar size={15} />
            Calendar
          </Link>
        </div>
      </header>

      {isCalendarView ? (
        <CalendarItinerary
          tripId={tripId}
          tripStart={format(trip.startDate, "yyyy-MM-dd")}
          tripEnd={format(trip.endDate, "yyyy-MM-dd")}
          attractions={attractions}
          dayCount={dayCount}
          canEdit={canEdit}
        />
      ) : (
        Array.from({ length: dayCount }).map((_, dayIndex) => {
          const dayAttractions = byDay.get(dayIndex) ?? [];
          const previousAttraction = dayAttractions.at(-1);
          const searchBias =
            previousAttraction?.lat !== null &&
            previousAttraction?.lat !== undefined &&
            previousAttraction.lng !== null &&
            previousAttraction.lng !== undefined
              ? {
                  lat: previousAttraction.lat,
                  lng: previousAttraction.lng,
                  label: previousAttraction.name,
                }
              : undefined;
          const date = addDays(trip.startDate, dayIndex);
          const hasMappable = dayAttractions.some((a) => a.lat !== null && a.lng !== null);

          return (
            <details key={dayIndex} open className="group flex flex-col gap-3">
              <summary className="flex cursor-pointer list-none items-center gap-3 select-none [&::-webkit-details-marker]:hidden">
                <span className="font-mono text-3xl leading-none font-light tabular-nums text-foreground-muted">
                  {String(dayIndex + 1).padStart(2, "0")}
                </span>
                <div className="flex flex-1 flex-col leading-tight">
                  <span className="text-[0.65rem] font-bold tracking-[0.2em] text-foreground-muted uppercase">
                    Day
                  </span>
                  <span className="text-lg font-bold">
                    {format(date, "EEE, MMM d")}
                  </span>
                </div>
                {hasMappable && (
                  <Link
                    href={`/trips/${tripId}/map?day=${dayIndex + 1}`}
                    aria-label={`View day ${dayIndex + 1} on map`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-primary"
                  >
                    <IconMap size={16} />
                  </Link>
                )}
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-foreground-muted transition-transform duration-200 group-open:rotate-180">
                  <IconChevronDown size={16} />
                </span>
              </summary>

              <DayAttractionsList
                tripId={tripId}
                attractions={dayAttractions}
                dayCount={dayCount}
                canEdit={canEdit}
              />

              {canEdit && (
                <div className="pl-[38px]">
                  <AddAttractionForm
                    tripId={tripId}
                    dayIndex={dayIndex}
                    searchBias={searchBias}
                  />
                </div>
              )}
            </details>
          );
        })
      )}
    </div>
  );
}
