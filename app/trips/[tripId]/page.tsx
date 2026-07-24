import Image from "next/image";
import Link from "next/link";
import { format, differenceInCalendarDays } from "date-fns";
import { requireTripAccess } from "@/lib/trip-access";
import { prisma } from "@/lib/prisma";
import { IconEdit } from "@/components/icons";

export default async function TripHomePage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const { trip, member } = await requireTripAccess(tripId, "VIEWER");

  const attractionCount = await prisma.attraction.count({ where: { tripId } });
  const dayCount = differenceInCalendarDays(trip.endDate, trip.startDate) + 1;

  return (
    <div className="flex flex-1 flex-col">
      <div className="relative h-72 w-full shrink-0 bg-hero-bg pt-[env(safe-area-inset-top)]">
        {trip.coverImageUrl && (
          <Image
            src={trip.coverImageUrl}
            alt=""
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        {member.role !== "VIEWER" && (
          <Link
            href={`/trips/${tripId}/edit`}
            className="absolute right-16 top-[calc(env(safe-area-inset-top)+1rem)] flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur"
            aria-label="Edit trip"
          >
            <IconEdit size={18} />
          </Link>
        )}

        <div className="absolute inset-x-0 bottom-0 px-6 pb-6 text-white">
          <p className="font-mono text-xs font-bold tracking-[0.2em] text-white/70 uppercase drop-shadow">
            {format(trip.startDate, "ddMMM")} — {format(trip.endDate, "ddMMM yyyy")}
          </p>
          <h1 className="text-3xl font-bold tracking-tight drop-shadow">
            {trip.name}
          </h1>
        </div>
      </div>

      <div className="flex gap-3 px-6 py-5">
        <div className="flex flex-1 flex-col items-center rounded-2xl border border-border bg-surface py-4">
          <span className="font-mono text-2xl font-bold tabular-nums">
            {String(dayCount).padStart(2, "0")}
          </span>
          <span className="text-xs font-bold tracking-wide text-foreground-muted uppercase">
            {dayCount === 1 ? "Day" : "Days"}
          </span>
        </div>
        <div className="flex flex-1 flex-col items-center rounded-2xl border border-border bg-surface py-4">
          <span className="font-mono text-2xl font-bold tabular-nums">
            {String(attractionCount).padStart(2, "0")}
          </span>
          <span className="text-xs font-bold tracking-wide text-foreground-muted uppercase">
            Places
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3 px-6">
        <Link
          href={`/trips/${tripId}/itinerary`}
          className="rounded-2xl bg-primary px-5 py-4 text-center font-bold text-primary-foreground shadow-sm active:scale-[0.99]"
        >
          Open itinerary
        </Link>
        <Link
          href={`/trips/${tripId}/map`}
          className="rounded-2xl border border-border bg-surface px-5 py-4 text-center font-bold active:scale-[0.99]"
        >
          View on map
        </Link>
      </div>
    </div>
  );
}
