import Link from "next/link";
import { requireTripAccess } from "@/lib/trip-access";
import { prisma } from "@/lib/prisma";
import { CATEGORIES, CATEGORY_META } from "@/lib/categories";

export default async function StatsPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  await requireTripAccess(tripId, "VIEWER");

  const counts = await prisma.attraction.groupBy({
    by: ["category"],
    where: { tripId },
    _count: { _all: true },
  });
  const countByCategory = new Map(counts.map((c) => [c.category, c._count._all]));

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 pt-[calc(env(safe-area-inset-top)+2rem)]">
      <h1 className="text-3xl font-bold tracking-tight">Stats</h1>

      <div className="grid grid-cols-2 gap-3">
        {CATEGORIES.map((category) => {
          const meta = CATEGORY_META[category];
          const count = countByCategory.get(category) ?? 0;
          return (
            <Link
              key={category}
              href={`/trips/${tripId}/stats/${category.toLowerCase()}`}
              className="card-elevated pressable relative flex flex-col gap-1 overflow-hidden rounded-2xl border border-border bg-surface p-5 pt-6"
            >
              <span
                aria-hidden
                className="absolute inset-x-0 top-0 h-1.5"
                style={{ background: meta.color }}
              />
              <meta.icon
                aria-hidden
                size={18}
                className="absolute top-4 right-4"
                style={{ color: meta.color }}
              />
              <span className="font-mono text-4xl font-bold tabular-nums">
                {String(count).padStart(2, "0")}
              </span>
              <span className="text-xs font-bold tracking-[0.15em] text-foreground-muted uppercase">
                {meta.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
