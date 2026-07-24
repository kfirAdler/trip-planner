"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireTripActionAccess } from "@/lib/trip-access";
import { prisma } from "@/lib/prisma";
import { saveImage } from "@/lib/storage";

const updateTripSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(100),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
  })
  .refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
    message: "End date must be on or after the start date",
    path: ["endDate"],
  });

export async function updateTripDetails(tripId: string, formData: FormData) {
  await requireTripActionAccess(tripId, "EDITOR");

  const parsed = updateTripSchema.parse({
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

  await prisma.trip.update({
    where: { id: tripId },
    data: {
      name: parsed.name,
      startDate: new Date(parsed.startDate),
      endDate: new Date(parsed.endDate),
      ...(coverImageUrl ? { coverImageUrl } : {}),
    },
  });

  revalidatePath(`/trips/${tripId}`);
  redirect(`/trips/${tripId}`);
}

export async function deleteTrip(tripId: string) {
  await requireTripActionAccess(tripId, "OWNER");
  await prisma.trip.delete({ where: { id: tripId } });
  redirect("/trips");
}
