"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { saveImage } from "@/lib/storage";

const createTripSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(100),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
  })
  .refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
    message: "End date must be on or after the start date",
    path: ["endDate"],
  });

export async function createTrip(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const parsed = createTripSchema.parse({
    name: formData.get("name"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
  });

  const coverFile = formData.get("cover");
  let coverImageUrl: string | undefined;
  if (coverFile instanceof File && coverFile.size > 0) {
    const saved = await saveImage(coverFile, { prefix: "cover" });
    coverImageUrl = saved.url;
  }

  const trip = await prisma.$transaction(async (tx) => {
    const created = await tx.trip.create({
      data: {
        name: parsed.name,
        startDate: new Date(parsed.startDate),
        endDate: new Date(parsed.endDate),
        coverImageUrl,
        ownerId: session.user.id,
      },
    });
    await tx.tripMember.create({
      data: { tripId: created.id, userId: session.user.id, role: "OWNER" },
    });
    return created;
  });

  redirect(`/trips/${trip.id}`);
}
