import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { TripRole } from "@/app/generated/prisma/client";

const ROLE_RANK: Record<TripRole, number> = {
  VIEWER: 0,
  EDITOR: 1,
  OWNER: 2,
};

// Authoritative permission check, called at the top of every trip page/layout
// and every mutating Server Action. Non-members get 404 (not 403) so a trip's
// existence isn't leaked to people who aren't on it.
export async function requireTripAccess(tripId: string, minRole: TripRole) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const member = await prisma.tripMember.findUnique({
    where: { tripId_userId: { tripId, userId: session.user.id } },
    include: { trip: true },
  });

  if (!member) notFound();
  if (ROLE_RANK[member.role] < ROLE_RANK[minRole]) notFound();

  return { trip: member.trip, member, userId: session.user.id };
}

// For Server Actions, which can't render a not-found boundary mid-mutation.
export async function requireTripActionAccess(tripId: string, minRole: TripRole) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const member = await prisma.tripMember.findUnique({
    where: { tripId_userId: { tripId, userId: session.user.id } },
    include: { trip: true },
  });

  if (!member || ROLE_RANK[member.role] < ROLE_RANK[minRole]) {
    throw new Error("Forbidden");
  }

  return { trip: member.trip, member, userId: session.user.id };
}
