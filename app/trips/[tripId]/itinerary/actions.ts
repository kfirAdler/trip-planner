"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireTripActionAccess } from "@/lib/trip-access";
import { prisma } from "@/lib/prisma";
import { saveImage } from "@/lib/storage";
import { CATEGORIES } from "@/lib/categories";
import type {
  Category,
  Prisma,
} from "@/app/generated/prisma/client";

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

function hasSortableTime(time: string | null): time is string {
  return time !== null && /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
}

async function repositionTimedAttraction(
  tx: Prisma.TransactionClient,
  tripId: string,
  dayIndex: number,
  attractionId: string
) {
  const dayItems = await tx.attraction.findMany({
    where: { tripId, dayIndex },
    orderBy: { position: "asc" },
    select: { id: true, position: true, time: true },
  });
  const target = dayItems.find((item) => item.id === attractionId);
  if (!target || !hasSortableTime(target.time)) return;
  const targetTime = target.time;

  const ordered = dayItems.filter((item) => item.id !== attractionId);
  const laterTimedIndex = ordered.findIndex(
    (item) =>
      hasSortableTime(item.time) &&
      item.time.localeCompare(targetTime) > 0
  );
  const lastTimedIndex = ordered.findLastIndex((item) =>
    hasSortableTime(item.time)
  );
  const insertionIndex =
    laterTimedIndex >= 0
      ? laterTimedIndex
      : lastTimedIndex >= 0
        ? lastTimedIndex + 1
        : ordered.length;
  ordered.splice(insertionIndex, 0, target);

  await Promise.all(
    ordered.map((item, position) =>
      tx.attraction.update({
        where: { id: item.id },
        data: { position },
      })
    )
  );
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

    if (hasSortableTime(created.time)) {
      await repositionTimedAttraction(tx, tripId, dayIndex, created.id);
      return;
    }

    const ordered = [...existing];
    const requestedIndex = existing.findIndex((item) => item.id === insertAfterId);
    const insertionIndex = requestedIndex >= 0 ? requestedIndex + 1 : existing.length;
    ordered.splice(insertionIndex, 0, created);

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
  const parsedCategory = z.enum(CATEGORIES as [string, ...string[]]).parse(
    category
  ) as Category;

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
      category: parsedCategory,
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

  revalidatePath(`/trips/${tripId}/stats/${parsedCategory.toLowerCase()}`);
  revalidatePath(`/trips/${tripId}/stats`);
  revalidatePath(`/trips/${tripId}/map`);
  revalidatePath(`/trips/${tripId}/search`);
  revalidatePath(`/trips/${tripId}`);
}

export async function linkAttractionToDay(
  tripId: string,
  attractionId: string,
  formData: FormData
) {
  await requireTripActionAccess(tripId, "EDITOR");
  const dayIndex = z.coerce.number().int().min(0).parse(formData.get("dayIndex"));

  await prisma.$transaction(async (tx) => {
    const attraction = await tx.attraction.findFirstOrThrow({
      where: { id: attractionId, tripId },
    });
    const last = await tx.attraction.findFirst({
      where: { tripId, dayIndex },
      orderBy: { position: "desc" },
    });

    await tx.attraction.update({
      where: { id: attractionId },
      data: { dayIndex, position: (last?.position ?? -1) + 1 },
    });

    if (hasSortableTime(attraction.time)) {
      await repositionTimedAttraction(tx, tripId, dayIndex, attractionId);
    }
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

  await prisma.$transaction(async (tx) => {
    const existing = await tx.attraction.findFirstOrThrow({
      where: { id: attractionId, tripId },
    });

    let position = existing.position;
    if (existing.dayIndex !== parsedDayIndex) {
      if (parsedDayIndex === null) {
        position = 0;
      } else {
        const last = await tx.attraction.findFirst({
          where: { tripId, dayIndex: parsedDayIndex },
          orderBy: { position: "desc" },
        });
        position = (last?.position ?? -1) + 1;
      }
    }

    const updated = await tx.attraction.update({
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
      select: { time: true },
    });

    if (parsedDayIndex !== null && hasSortableTime(updated.time)) {
      await repositionTimedAttraction(
        tx,
        tripId,
        parsedDayIndex,
        attractionId
      );
    }
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
