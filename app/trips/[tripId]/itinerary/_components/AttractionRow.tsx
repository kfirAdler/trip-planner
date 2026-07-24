"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CATEGORIES, CATEGORY_META } from "@/lib/categories";
import {
  updateAttraction,
  removeAttraction,
  moveAttraction,
  linkAttractionToDay,
} from "../actions";
import { PlaceAutocomplete } from "./PlaceAutocomplete";
import {
  IconEdit,
  IconRemove,
  IconMoveUp,
  IconMoveDown,
  IconChevronDown,
  IconMap,
} from "@/components/icons";

export type Attraction = {
  id: string;
  name: string;
  category: (typeof CATEGORIES)[number];
  dayIndex: number | null;
  time: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  notes: string | null;
  photoUrl: string | null;
};

export function AttractionRow({
  tripId,
  attraction,
  dayCount,
  canEdit,
  canReorder = true,
  showDay = false,
  isFirst,
  isLast,
  onMove,
  isMoving = false,
}: {
  tripId: string;
  attraction: Attraction;
  dayCount: number;
  canEdit: boolean;
  canReorder?: boolean;
  showDay?: boolean;
  isFirst: boolean;
  isLast: boolean;
  onMove?: (direction: "up" | "down") => void;
  isMoving?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const meta = CATEGORY_META[attraction.category];

  const updateAction = updateAttraction.bind(null, tripId, attraction.id);
  const removeAction = removeAttraction.bind(null, tripId, attraction.id);
  const moveUp = moveAttraction.bind(null, tripId, attraction.id, "up");
  const moveDown = moveAttraction.bind(null, tripId, attraction.id, "down");
  const linkAction = linkAttractionToDay.bind(null, tripId, attraction.id);

  if (isEditing) {
    return (
      <form
        action={async (formData) => {
          await updateAction(formData);
          setIsEditing(false);
        }}
        className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4"
      >
        <PlaceAutocomplete
          defaultName={attraction.name}
          defaultAddress={attraction.address ?? ""}
          defaultLat={attraction.lat}
          defaultLng={attraction.lng}
        />
        <div className="flex gap-2">
          <select
            name="category"
            defaultValue={attraction.category}
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_META[c].label}
              </option>
            ))}
          </select>
          <input
            type="time"
            name="time"
            defaultValue={attraction.time ?? ""}
            className="w-28 rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        <label className="flex flex-col gap-1 text-xs font-bold text-foreground-muted">
          Day
          <select
            name="dayIndex"
            defaultValue={attraction.dayIndex ?? ""}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal text-foreground"
          >
            <option value="">Unscheduled</option>
            {Array.from({ length: dayCount }).map((_, i) => (
              <option key={i} value={i}>
                Day {i + 1}
              </option>
            ))}
          </select>
        </label>
        <textarea
          name="notes"
          placeholder="Notes (optional)"
          defaultValue={attraction.notes ?? ""}
          rows={2}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <input
          type="file"
          name="photo"
          accept="image/*"
          className="text-xs file:mr-2 file:rounded-full file:border-0 file:bg-primary file:px-2 file:py-1 file:text-xs file:font-bold file:text-primary-foreground"
        />
        <div className="mt-1 flex gap-2">
          <button
            type="submit"
            className="flex-1 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="rounded-full border border-border px-4 py-2 text-sm font-bold"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="card-elevated rounded-2xl border border-border bg-surface p-3">
      <button
        type="button"
        onClick={() => setIsExpanded((expanded) => !expanded)}
        aria-expanded={isExpanded}
        className="flex w-full gap-3 text-left"
      >
        {attraction.photoUrl && (
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-surface-muted">
            <Image
              src={attraction.photoUrl}
              alt=""
              fill
              className="object-cover"
              sizes="56px"
            />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="flex min-w-0 items-center gap-1.5 leading-tight font-bold">
              <meta.icon
                size={15}
                className="shrink-0"
                style={{ color: meta.color }}
                aria-hidden
              />
              <span className="truncate">{attraction.name}</span>
            </p>
            <div className="flex shrink-0 items-center gap-1.5">
              {showDay && attraction.dayIndex !== null && (
                <span className="rounded-full bg-surface-muted px-2 py-0.5 font-mono text-xs font-bold tabular-nums text-foreground-muted">
                  Day {attraction.dayIndex + 1}
                </span>
              )}
              {attraction.time && (
                <span className="rounded-full bg-surface-muted px-2 py-0.5 font-mono text-xs font-bold tabular-nums text-foreground-muted">
                  {attraction.time}
                </span>
              )}
              <span
                className={[
                  "flex h-6 w-6 items-center justify-center rounded-full border border-border text-foreground-muted transition-transform duration-300",
                  isExpanded ? "rotate-180" : "",
                ].join(" ")}
                aria-hidden
              >
                <IconChevronDown size={13} />
              </span>
            </div>
          </div>
          {attraction.address && (
            <p className="mt-1 truncate text-xs font-light text-foreground-muted">
              {attraction.address}
            </p>
          )}
          {!attraction.address && (
            <p className="mt-1 text-xs font-light text-foreground-muted">
              Tap to see details
            </p>
          )}
        </div>
      </button>

      <div
        className={[
          "grid transition-[grid-template-rows] duration-300 ease-out",
          isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        ].join(" ")}
      >
        <div className="overflow-hidden">
          <div className="mt-3 border-t border-border pt-3">
            <dl className="grid grid-cols-2 gap-3">
              <div>
                <dt className="font-mono text-[0.6rem] font-bold tracking-widest text-foreground-muted uppercase">
                  Category
                </dt>
                <dd className="mt-0.5 flex items-center gap-1.5 text-sm font-bold">
                  <meta.icon size={14} style={{ color: meta.color }} aria-hidden />
                  {meta.label}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[0.6rem] font-bold tracking-widest text-foreground-muted uppercase">
                  Schedule
                </dt>
                <dd className="mt-0.5 text-sm font-bold">
                  {attraction.dayIndex === null
                    ? "Unscheduled"
                    : `Day ${attraction.dayIndex + 1}`}
                  {attraction.time ? ` · ${attraction.time}` : ""}
                </dd>
              </div>
            </dl>

            {attraction.address && (
              <div className="mt-3">
                <p className="font-mono text-[0.6rem] font-bold tracking-widest text-foreground-muted uppercase">
                  Address
                </p>
                <p className="mt-0.5 text-sm font-light">{attraction.address}</p>
              </div>
            )}

            {attraction.notes && (
              <div className="mt-3">
                <p className="font-mono text-[0.6rem] font-bold tracking-widest text-foreground-muted uppercase">
                  Notes
                </p>
                <p className="mt-0.5 whitespace-pre-wrap text-sm font-light text-foreground-muted">
                  {attraction.notes}
                </p>
              </div>
            )}

            {attraction.lat !== null && attraction.lng !== null && (
              <Link
                href={
                  attraction.dayIndex === null
                    ? `/trips/${tripId}/map`
                    : `/trips/${tripId}/map?day=${attraction.dayIndex + 1}`
                }
                className="mt-3 flex w-fit items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1.5 text-xs font-bold text-primary"
              >
                <IconMap size={14} />
                View on map
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-0.5">
        {canEdit && attraction.dayIndex === null && (
          <form action={linkAction} className="mt-2 flex items-center gap-1.5">
            <select
              name="dayIndex"
              defaultValue={0}
              className="flex-1 rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
            >
              {Array.from({ length: dayCount }).map((_, i) => (
                <option key={i} value={i}>
                  Day {i + 1}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
            >
              Link to day
            </button>
          </form>
        )}

        {canEdit && (
          <div className="mt-2 flex items-center gap-1.5">
            {canReorder && (
              <>
                {onMove ? (
                  <>
                    <button
                      type="button"
                      onClick={() => onMove("up")}
                      disabled={isFirst || isMoving}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-border transition-colors disabled:opacity-30"
                      aria-label="Move up"
                    >
                      <IconMoveUp size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onMove("down")}
                      disabled={isLast || isMoving}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-border transition-colors disabled:opacity-30"
                      aria-label="Move down"
                    >
                      <IconMoveDown size={14} />
                    </button>
                  </>
                ) : (
                  <>
                    <form action={moveUp}>
                      <button
                        type="submit"
                        disabled={isFirst}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-border disabled:opacity-30"
                        aria-label="Move up"
                      >
                        <IconMoveUp size={14} />
                      </button>
                    </form>
                    <form action={moveDown}>
                      <button
                        type="submit"
                        disabled={isLast}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-border disabled:opacity-30"
                        aria-label="Move down"
                      >
                        <IconMoveDown size={14} />
                      </button>
                    </form>
                  </>
                )}
              </>
            )}
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="ml-auto flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-bold"
            >
              <IconEdit size={13} />
              Edit
            </button>
            <form
              action={removeAction}
              onSubmit={(e) => {
                if (!confirm(`Remove "${attraction.name}" from the itinerary?`)) {
                  e.preventDefault();
                }
              }}
            >
              <button
                type="submit"
                className="flex items-center gap-1 rounded-full border border-accent px-3 py-1 text-xs font-bold text-accent"
              >
                <IconRemove size={13} />
                Remove
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
