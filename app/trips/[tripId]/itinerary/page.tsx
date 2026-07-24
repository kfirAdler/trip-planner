import Link from "next/link";
import { addDays, differenceInCalendarDays, format } from "date-fns";
import { requireTripAccess } from "@/lib/trip-access";
import { prisma } from "@/lib/prisma";
import { CATEGORY_META } from "@/lib/categories";
import { IconMap, IconChevronDown } from "@/components/icons";
import { AttractionRow } from "./_components/AttractionRow";
import { AddAttractionForm } from "./_components/AddAttractionForm";

export default async function ItineraryPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const { trip, member } = await requireTripAccess(tripId, "VIEWER");
  const canEdit = member.role !== "VIEWER";

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
      <h1 className="text-3xl font-bold tracking-tight">Itinerary</h1>

      {Array.from({ length: dayCount }).map((_, dayIndex) => {
        const dayAttractions = byDay.get(dayIndex) ?? [];
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

            {dayAttractions.length === 0 ? (
              <p className="pl-1 text-sm font-light text-foreground-muted">
                Nothing planned yet.
              </p>
            ) : (
              <div className="relative flex flex-col gap-3">
                {dayAttractions.length > 1 && (
                  <div
                    aria-hidden
                    className="absolute top-3 bottom-3 left-[15px] w-px bg-border"
                  />
                )}
                {dayAttractions.map((attraction, i) => {
                  const meta = CATEGORY_META[attraction.category];
                  const isTerminus = attraction.category === "LODGING";
                  return (
                    <div key={attraction.id} className="relative flex gap-3">
                      <div className="relative z-10 flex w-[30px] shrink-0 justify-center pt-3.5">
                        <span
                          className={
                            isTerminus
                              ? "h-4 w-4 shrink-0 rounded-full ring-[3px] ring-background"
                              : "h-3 w-3 shrink-0 rounded-full ring-[3px] ring-background"
                          }
                          style={{ background: meta.color }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <AttractionRow
                          tripId={tripId}
                          attraction={attraction}
                          dayCount={dayCount}
                          canEdit={canEdit}
                          isFirst={i === 0}
                          isLast={i === dayAttractions.length - 1}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {canEdit && (
              <div className="pl-[38px]">
                <AddAttractionForm tripId={tripId} dayIndex={dayIndex} />
              </div>
            )}
          </details>
        );
      })}
    </div>
  );
}
