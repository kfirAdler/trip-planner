import Link from "next/link";
import { notFound } from "next/navigation";
import { differenceInCalendarDays } from "date-fns";
import { requireTripAccess } from "@/lib/trip-access";
import { prisma } from "@/lib/prisma";
import { CATEGORIES, CATEGORY_META } from "@/lib/categories";
import { AttractionRow } from "../../itinerary/_components/AttractionRow";
import { AddAttractionForm } from "../../itinerary/_components/AddAttractionForm";
import { IconBack } from "@/components/icons";
import type { Category } from "@/app/generated/prisma/client";

export default async function CategoryDetailPage({
  params,
}: {
  params: Promise<{ tripId: string; category: string }>;
}) {
  const { tripId, category: categoryParam } = await params;
  const category = categoryParam.toUpperCase() as Category;
  if (!CATEGORIES.includes(category)) notFound();

  const [{ trip, member }, attractions] = await Promise.all([
    requireTripAccess(tripId, "VIEWER"),
    prisma.attraction.findMany({
      where: { tripId, category },
      orderBy: [{ dayIndex: "asc" }, { position: "asc" }],
    }),
  ]);
  const canEdit = member.role !== "VIEWER";
  const dayCount = differenceInCalendarDays(trip.endDate, trip.startDate) + 1;
  const meta = CATEGORY_META[category];

  const scheduled = attractions.filter((a) => a.dayIndex !== null);
  const unscheduled = attractions.filter((a) => a.dayIndex === null);

  return (
    <div className="flex flex-1 flex-col gap-4 px-6 pt-[calc(env(safe-area-inset-top)+2rem)]">
      <Link
        href={`/trips/${tripId}/stats`}
        className="flex w-fit items-center gap-0.5 text-sm font-bold text-foreground-muted"
      >
        <IconBack size={16} />
        Stats
      </Link>
      <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
        <meta.icon size={26} style={{ color: meta.color }} />
        {meta.label}
      </h1>
      <p className="-mt-2 text-sm font-light text-foreground-muted">
        {attractions.length} {attractions.length === 1 ? "place" : "places"}
      </p>

      <div className="flex flex-col gap-2">
        {attractions.length === 0 && (
          <p className="text-sm font-light text-foreground-muted">
            No {meta.label.toLowerCase()} places added yet.
          </p>
        )}
        {scheduled.map((attraction) => (
          <AttractionRow
            key={attraction.id}
            tripId={tripId}
            attraction={attraction}
            dayCount={dayCount}
            canEdit={canEdit}
            canReorder={false}
            showDay
            isFirst
            isLast
          />
        ))}
      </div>

      {unscheduled.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-xs font-bold tracking-[0.15em] text-foreground-muted uppercase">
            Not yet scheduled
          </h2>
          {unscheduled.map((attraction) => (
            <AttractionRow
              key={attraction.id}
              tripId={tripId}
              attraction={attraction}
              dayCount={dayCount}
              canEdit={canEdit}
              canReorder={false}
              isFirst
              isLast
            />
          ))}
        </div>
      )}

      {canEdit && <AddAttractionForm tripId={tripId} fixedCategory={category} />}
    </div>
  );
}
