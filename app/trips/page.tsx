import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { IconLogout } from "@/components/icons";

export default async function TripsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const memberships = await prisma.tripMember.findMany({
    where: { userId: session.user.id },
    include: { trip: true },
    orderBy: { trip: { startDate: "asc" } },
  });

  return (
    <div className="flex flex-1 flex-col pb-28">
      <header className="flex items-end justify-between gap-4 px-6 pt-[calc(env(safe-area-inset-top)+2rem)] pb-4">
        <div>
          <span className="text-sm font-light tracking-[0.3em] text-foreground-muted uppercase">
            Welcome{session.user.name ? `, ${session.user.name.split(" ")[0]}` : ""}
          </span>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">My Trips</h1>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="pressable mb-0.5 flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-2 text-xs font-bold text-foreground-muted shadow-[var(--shadow-card)]"
          >
            <IconLogout size={15} />
            Log out
          </button>
        </form>
      </header>

      <div className="flex flex-1 flex-col gap-4 px-6">
        {memberships.length === 0 && (
          <div className="mt-8 flex flex-col items-center gap-2 text-center text-foreground-muted">
            <p className="text-lg font-bold text-foreground">No trips yet</p>
            <p className="max-w-xs text-sm font-light">
              Start planning your Japan trip — add a name and your travel
              dates to get going.
            </p>
          </div>
        )}

        {memberships.map(({ trip, role }) => (
          <Link
            key={trip.id}
            href={`/trips/${trip.id}`}
            className="card-elevated pressable flex overflow-hidden rounded-2xl border border-border bg-surface"
          >
            <div className="relative h-24 w-24 shrink-0 bg-surface-muted">
              {trip.coverImageUrl ? (
                <Image
                  src={trip.coverImageUrl}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="96px"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl">
                  🗾
                </div>
              )}
            </div>
            <div className="flex flex-1 flex-col justify-center gap-1 px-4 py-3">
              <p className="font-bold leading-tight">{trip.name}</p>
              <p className="text-sm font-light text-foreground-muted">
                {format(trip.startDate, "MMM d")} –{" "}
                {format(trip.endDate, "MMM d, yyyy")}
              </p>
              {role !== "OWNER" && (
                <span className="w-fit rounded-full bg-surface-muted px-2 py-0.5 text-xs font-bold text-foreground-muted">
                  Shared · {role === "EDITOR" ? "Can edit" : "Can view"}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>

      <Link
        href="/trips/new"
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+1.5rem)] right-6 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-2xl font-bold text-accent-foreground shadow-lg active:scale-95"
        aria-label="New trip"
      >
        +
      </Link>
    </div>
  );
}
