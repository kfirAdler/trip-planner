"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireTripActionAccess } from "@/lib/trip-access";
import { prisma } from "@/lib/prisma";

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  role: z.enum(["EDITOR", "VIEWER"]),
});

export async function inviteMember(tripId: string, formData: FormData) {
  const { trip, userId } = await requireTripActionAccess(tripId, "OWNER");

  const parsed = inviteSchema.parse({
    email: formData.get("email"),
    role: formData.get("role"),
  });

  const existingUser = await prisma.user.findUnique({
    where: { email: parsed.email },
  });

  if (existingUser?.id === trip.ownerId) {
    throw new Error("This person already owns the trip");
  }

  if (existingUser) {
    const existingMembership = await prisma.tripMember.findUnique({
      where: { tripId_userId: { tripId, userId: existingUser.id } },
    });
    if (existingMembership) {
      throw new Error("This person already has access to the trip");
    }
    await prisma.tripMember.create({
      data: { tripId, userId: existingUser.id, role: parsed.role },
    });
  } else {
    await prisma.tripInvite.upsert({
      where: { tripId_email: { tripId, email: parsed.email } },
      create: {
        tripId,
        email: parsed.email,
        role: parsed.role,
        invitedById: userId,
      },
      update: { role: parsed.role, status: "PENDING", resolvedAt: null },
    });
  }

  revalidatePath(`/trips/${tripId}/share`);
}

export async function changeMemberRole(
  tripId: string,
  memberId: string,
  role: "EDITOR" | "VIEWER"
) {
  await requireTripActionAccess(tripId, "OWNER");

  const member = await prisma.tripMember.findFirstOrThrow({
    where: { id: memberId, tripId },
  });
  if (member.role === "OWNER") throw new Error("Cannot change the owner's role");

  await prisma.tripMember.update({ where: { id: memberId }, data: { role } });
  revalidatePath(`/trips/${tripId}/share`);
}

export async function removeMember(tripId: string, memberId: string) {
  await requireTripActionAccess(tripId, "OWNER");

  const member = await prisma.tripMember.findFirstOrThrow({
    where: { id: memberId, tripId },
  });
  if (member.role === "OWNER") throw new Error("Cannot remove the trip owner");

  await prisma.tripMember.delete({ where: { id: memberId } });
  revalidatePath(`/trips/${tripId}/share`);
}

export async function revokeInvite(tripId: string, inviteId: string) {
  await requireTripActionAccess(tripId, "OWNER");
  await prisma.tripInvite.delete({ where: { id: inviteId, tripId } });
  revalidatePath(`/trips/${tripId}/share`);
}
