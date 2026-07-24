import Link from "next/link";
import { addDays, differenceInCalendarDays, format } from "date-fns";
import { requireTripAccess } from "@/lib/trip-access";
import { prisma } from "@/lib/prisma";
import { IconClose } from "@/components/icons";
import { TripMap } from "./_components/TripMap";

export default async function MapPage({
  params,
  searchParams,
}: {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<{ day?: string }>;
}) {
  const { tripId } = await params;
  const { trip } = await requireTripAccess(tripId, "VIEWER");
  const { day: rawDay } = await searchParams;

  const apiKey = process.env.NEXT_PUBLIC_ARCGIS_API_KEY;
  const dayCount = differenceInCalendarDays(trip.endDate, trip.startDate) + 1;

  const parsedDay = Number(rawDay);
  const dayIndex =
    Number.isInteger(parsedDay) && parsedDay >= 1 && parsedDay <= dayCount
      ? parsedDay - 1
      : null;

  const all = await prisma.attraction.findMany({ where: { tripId } });
  const mappable = all
    .filter(
      (a): a is typeof a & { lat: number; lng: number } =>
        a.lat !== null && a.lng !== null
    )
    .filter((a) => dayIndex === null || a.dayIndex === dayIndex);

  if (!apiKey) {
    return (
      <EmptyState
        title="Map isn't set up yet"
        message="Add NEXT_PUBLIC_ARCGIS_API_KEY to .env.local to see your places on a map."
      />
    );
  }

  if (mappable.length === 0) {
    return (
      <EmptyState
        title={dayIndex === null ? "No places on the map yet" : `Nothing on Day ${dayIndex + 1} has a location yet`}
        message={
          all.length === 0
            ? "Add places from the itinerary page to see them here."
            : "Add a latitude/longitude to your places (from the itinerary page) to plot them here."
        }
        dayIndex={dayIndex}
        tripId={tripId}
      />
    );
  }

  return (
    <div className="relative flex flex-1 flex-col">
      {dayIndex !== null && (
        <div className="absolute inset-x-0 top-0 z-10 flex justify-center pt-[calc(env(safe-area-inset-top)+0.75rem)]">
          <Link
            href={`/trips/${tripId}/map`}
            className="flex items-center gap-2 rounded-full bg-surface/90 px-4 py-2 font-mono text-xs font-bold tracking-widest text-foreground shadow-md backdrop-blur uppercase"
          >
            Day {String(dayIndex + 1).padStart(2, "0")} ·{" "}
            {format(addDays(trip.startDate, dayIndex), "EEE, MMM d")}
            <IconClose size={14} />
          </Link>
        </div>
      )}
      <TripMap attractions={mappable} apiKey={apiKey} />
    </div>
  );
}

function EmptyState({
  title,
  message,
  dayIndex,
  tripId,
}: {
  title: string;
  message: string;
  dayIndex?: number | null;
  tripId?: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-8 text-center">
      <p className="text-lg font-bold">{title}</p>
      <p className="text-sm font-light text-foreground-muted">{message}</p>
      {dayIndex !== null && dayIndex !== undefined && tripId && (
        <Link
          href={`/trips/${tripId}/map`}
          className="mt-2 text-sm font-bold text-primary"
        >
          View all places instead
        </Link>
      )}
    </div>
  );
}
