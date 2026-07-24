"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireTripActionAccess } from "@/lib/trip-access";
import { prisma } from "@/lib/prisma";
import { saveImage } from "@/lib/storage";
import { CATEGORIES } from "@/lib/categories";
import type { Category } from "@/app/generated/prisma/client";

const attractionSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  category: z.enum(CATEGORIES as [string, ...string[]]),
  dayIndex: z.coerce.number().int().min(0).optional(),
  time: z.string().trim().max(20).optional().or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

function readAttractionForm(
  tripId: string,
  dayIndex: number | undefined,
  formData: FormData
) {
  const latRaw = formData.get("lat");
  const lngRaw = formData.get("lng");

  return attractionSchema.parse({
    name: formData.get("name"),
    category: formData.get("category"),
    dayIndex,
    time: formData.get("time") ?? "",
    address: formData.get("address") ?? "",
    lat: latRaw && String(latRaw).trim() !== "" ? latRaw : undefined,
    lng: lngRaw && String(lngRaw).trim() !== "" ? lngRaw : undefined,
    notes: formData.get("notes") ?? "",
  });
}

async function nextPositionForDay(tripId: string, dayIndex: number) {
  const last = await prisma.attraction.findFirst({
    where: { tripId, dayIndex },
    orderBy: { position: "desc" },
  });
  return (last?.position ?? -1) + 1;
}

function hasSortableTime(time: string | null): time is string {
  return time !== null && /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
}

export async function addAttraction(
  tripId: string,
  dayIndex: number,
  formData: FormData
) {
  const { userId } = await requireTripActionAccess(tripId, "EDITOR");
  const parsed = readAttractionForm(tripId, dayIndex, formData);

  const photoFile = formData.get("photo");
  let photoUrl: string | undefined;
  if (photoFile instanceof File && photoFile.size > 0) {
    photoUrl = (await saveImage(photoFile, { prefix: "attraction" })).url;
  }

  const insertAfterId = String(formData.get("insertAfterId") ?? "").trim();

  await prisma.$transaction(async (tx) => {
    const existing = await tx.attraction.findMany({
      where: { tripId, dayIndex },
      orderBy: { position: "asc" },
      select: { id: true, position: true, time: true },
    });

    const created = await tx.attraction.create({
      data: {
        tripId,
        name: parsed.name,
        category: parsed.category as Category,
        dayIndex,
        position: (existing.at(-1)?.position ?? -1) + 1,
        time: parsed.time || null,
        address: parsed.address || null,
        lat: parsed.lat ?? null,
        lng: parsed.lng ?? null,
        notes: parsed.notes || null,
        photoUrl,
        createdById: userId,
      },
      select: { id: true, position: true, time: true },
    });

    const ordered = [...existing];

    if (hasSortableTime(created.time)) {
      // Place the new stop chronologically among the day's timed stops without
      // disturbing the user's existing manual order for untimed stops.
      const laterTimedIndex = existing.findIndex(
        (item) =>
          hasSortableTime(item.time) &&
          item.time.localeCompare(created.time as string) > 0
      );
      const lastTimedIndex = existing.findLastIndex((item) =>
        hasSortableTime(item.time)
      );
      const insertionIndex =
        laterTimedIndex >= 0
          ? laterTimedIndex
          : lastTimedIndex >= 0
            ? lastTimedIndex + 1
            : existing.length;
      ordered.splice(insertionIndex, 0, created);
    } else {
      const requestedIndex = existing.findIndex((item) => item.id === insertAfterId);
      const insertionIndex = requestedIndex >= 0 ? requestedIndex + 1 : existing.length;
      ordered.splice(insertionIndex, 0, created);
    }

    await Promise.all(
      ordered.map((item, position) =>
        tx.attraction.update({
          where: { id: item.id },
          data: { position },
        })
      )
    );
  });

  revalidatePath(`/trips/${tripId}/itinerary`);
  revalidatePath(`/trips/${tripId}/map`);
  revalidatePath(`/trips/${tripId}/stats`);
  revalidatePath(`/trips/${tripId}`);
}

export async function addUnscheduledAttraction(
  tripId: string,
  category: Category,
  formData: FormData
) {
  const { userId } = await requireTripActionAccess(tripId, "EDITOR");

  const latRaw = formData.get("lat");
  const lngRaw = formData.get("lng");
  const parsed = attractionSchema
    .omit({ dayIndex: true, category: true })
    .parse({
      name: formData.get("name"),
      time: formData.get("time") ?? "",
      address: formData.get("address") ?? "",
      lat: latRaw && String(latRaw).trim() !== "" ? latRaw : undefined,
      lng: lngRaw && String(lngRaw).trim() !== "" ? lngRaw : undefined,
      notes: formData.get("notes") ?? "",
    });

  const photoFile = formData.get("photo");
  let photoUrl: string | undefined;
  if (photoFile instanceof File && photoFile.size > 0) {
    photoUrl = (await saveImage(photoFile, { prefix: "attraction" })).url;
  }

  await prisma.attraction.create({
    data: {
      tripId,
      name: parsed.name,
      category,
      dayIndex: null,
      position: 0,
      time: parsed.time || null,
      address: parsed.address || null,
      lat: parsed.lat ?? null,
      lng: parsed.lng ?? null,
      notes: parsed.notes || null,
      photoUrl,
      createdById: userId,
    },
  });

  revalidatePath(`/trips/${tripId}/stats/${category.toLowerCase()}`);
  revalidatePath(`/trips/${tripId}/stats`);
  revalidatePath(`/trips/${tripId}/map`);
  revalidatePath(`/trips/${tripId}`);
}

export async function linkAttractionToDay(
  tripId: string,
  attractionId: string,
  formData: FormData
) {
  await requireTripActionAccess(tripId, "EDITOR");
  const dayIndex = z.coerce.number().int().min(0).parse(formData.get("dayIndex"));

  await prisma.attraction.update({
    where: { id: attractionId },
    data: { dayIndex, position: await nextPositionForDay(tripId, dayIndex) },
  });

  revalidatePath(`/trips/${tripId}/itinerary`);
  revalidatePath(`/trips/${tripId}/stats`);
  revalidatePath(`/trips/${tripId}/map`);
  revalidatePath(`/trips/${tripId}`);
}

export async function updateAttraction(
  tripId: string,
  attractionId: string,
  formData: FormData
) {
  await requireTripActionAccess(tripId, "EDITOR");

  const dayIndexRaw = formData.get("dayIndex");
  const newDayIndex =
    dayIndexRaw === null || String(dayIndexRaw).trim() === ""
      ? undefined
      : Number(dayIndexRaw);
  const parsed = readAttractionForm(tripId, newDayIndex, formData);
  const parsedDayIndex = parsed.dayIndex ?? null;

  const photoFile = formData.get("photo");
  let photoUrl: string | undefined;
  if (photoFile instanceof File && photoFile.size > 0) {
    photoUrl = (await saveImage(photoFile, { prefix: "attraction" })).url;
  }

  const existing = await prisma.attraction.findFirstOrThrow({
    where: { id: attractionId, tripId },
  });

  let position = existing.position;
  if (existing.dayIndex !== parsedDayIndex) {
    position = parsedDayIndex === null ? 0 : await nextPositionForDay(tripId, parsedDayIndex);
  }

  await prisma.attraction.update({
    where: { id: attractionId },
    data: {
      name: parsed.name,
      category: parsed.category as Category,
      dayIndex: parsedDayIndex,
      position,
      time: parsed.time || null,
      address: parsed.address || null,
      lat: parsed.lat ?? null,
      lng: parsed.lng ?? null,
      notes: parsed.notes || null,
      ...(photoUrl ? { photoUrl } : {}),
    },
  });

  revalidatePath(`/trips/${tripId}/itinerary`);
  revalidatePath(`/trips/${tripId}/map`);
  revalidatePath(`/trips/${tripId}/stats`);
  revalidatePath(`/trips/${tripId}`);
}

export async function removeAttraction(tripId: string, attractionId: string) {
  await requireTripActionAccess(tripId, "EDITOR");
  await prisma.attraction.delete({ where: { id: attractionId } });

  revalidatePath(`/trips/${tripId}/itinerary`);
  revalidatePath(`/trips/${tripId}/map`);
  revalidatePath(`/trips/${tripId}/stats`);
  revalidatePath(`/trips/${tripId}`);
}

export async function moveAttraction(
  tripId: string,
  attractionId: string,
  direction: "up" | "down"
) {
  await requireTripActionAccess(tripId, "EDITOR");

  const current = await prisma.attraction.findFirstOrThrow({
    where: { id: attractionId, tripId },
  });

  const neighbor = await prisma.attraction.findFirst({
    where: {
      tripId,
      dayIndex: current.dayIndex,
      position: direction === "up" ? { lt: current.position } : { gt: current.position },
    },
    orderBy: { position: direction === "up" ? "desc" : "asc" },
  });

  if (!neighbor) return;

  await prisma.$transaction([
    prisma.attraction.update({
      where: { id: current.id },
      data: { position: neighbor.position },
    }),
    prisma.attraction.update({
      where: { id: neighbor.id },
      data: { position: current.position },
    }),
  ]);

  revalidatePath(`/trips/${tripId}/itinerary`);
}
