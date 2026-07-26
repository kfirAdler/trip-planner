import { addDays, format } from "date-fns";
import { requireTripAccess } from "@/lib/trip-access";
import { prisma } from "@/lib/prisma";
import { TripSearch, type TripSearchItem } from "./_components/TripSearch";

const COUNTRY_PARTS = new Set([
  "japan",
  "jp",
  "日本",
]);

function cityFromAddress(address: string | null) {
  if (!address) return null;

  const parts = address
    .split(",")
    .map((part) =>
      part
        .trim()
        .replace(/\s*(?:〒\s*)?\d{3}[-\s]?\d{4}$/, "")
        .trim()
    )
    .filter(Boolean)
    .filter((part) => !COUNTRY_PARTS.has(part.toLocaleLowerCase()))
    .filter((part) => !/^\d+$/.test(part));

  return parts.length > 1 ? (parts.at(-1) ?? null) : null;
}

export default async function SearchPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const [{ trip }, attractions] = await Promise.all([
    requireTripAccess(tripId, "VIEWER"),
    prisma.attraction.findMany({
      where: { tripId },
      orderBy: [{ dayIndex: "asc" }, { position: "asc" }],
      select: {
        id: true,
        name: true,
        address: true,
        category: true,
        dayIndex: true,
        position: true,
        time: true,
        lat: true,
        lng: true,
      },
    }),
  ]);

  const stopByDay = new Map<number, number>();
  const items: TripSearchItem[] = attractions.map((attraction) => {
    const dayIndex = attraction.dayIndex;
    const stopNumber =
      dayIndex === null ? null : (stopByDay.get(dayIndex) ?? 0) + 1;
    if (dayIndex !== null && stopNumber !== null) {
      stopByDay.set(dayIndex, stopNumber);
    }

    return {
      id: attraction.id,
      name: attraction.name,
      address: attraction.address,
      category: attraction.category,
      city: cityFromAddress(attraction.address),
      dayIndex,
      dayLabel:
        dayIndex === null
          ? null
          : format(addDays(trip.startDate, dayIndex), "EEE, MMM d"),
      stopNumber,
      time: attraction.time,
      mappable: attraction.lat !== null && attraction.lng !== null,
    };
  });

  return <TripSearch tripId={tripId} items={items} />;
}
