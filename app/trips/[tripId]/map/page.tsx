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
  const [{ tripId }, { day: rawDay }] = await Promise.all([
    params,
    searchParams,
  ]);
  const [{ trip }, all] = await Promise.all([
    requireTripAccess(tripId, "VIEWER"),
    prisma.attraction.findMany({
      where: { tripId },
      orderBy: [{ dayIndex: "asc" }, { position: "asc" }],
    }),
  ]);

  // Keep one ArcGIS credential for both the server-side geocoder and the
  // browser map. This page is server-rendered, so the key is only handed to
  // the authenticated map component instead of requiring a second public env
  // variable.
  const apiKey = process.env.ARCGIS_API_KEY;
  const dayCount = differenceInCalendarDays(trip.endDate, trip.startDate) + 1;

  const parsedDay = Number(rawDay);
  const dayIndex =
    Number.isInteger(parsedDay) && parsedDay >= 1 && parsedDay <= dayCount
      ? parsedDay - 1
      : null;

  const ordered = [
    ...all.filter((attraction) => attraction.dayIndex !== null),
    ...all.filter((attraction) => attraction.dayIndex === null),
  ];
  const mappable = ordered
    .filter(
      (a): a is typeof a & { lat: number; lng: number } =>
        a.lat !== null && a.lng !== null
    )
    .filter((a) => dayIndex === null || a.dayIndex === dayIndex)
    .map((attraction, index) => ({
      ...attraction,
      routeOrder: index + 1,
    }));
  const initialLocation = ordered.find(
    (attraction) => attraction.lat !== null && attraction.lng !== null
  );

  if (!apiKey) {
    return (
      <EmptyState
        title="Map isn't set up yet"
        message="Add ARCGIS_API_KEY to the app environment to see your places on a map."
      />
    );
  }

  return (
    <div className="fixed inset-x-0 top-0 bottom-[calc(3.25rem+env(safe-area-inset-bottom))] mx-auto flex max-w-screen-sm flex-col overflow-hidden overscroll-none">
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
      <TripMap
        attractions={mappable}
        apiKey={apiKey}
        initialCenter={
          initialLocation?.lat !== null &&
          initialLocation?.lat !== undefined &&
          initialLocation.lng !== null
            ? { lat: initialLocation.lat, lng: initialLocation.lng }
            : undefined
        }
      />
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
