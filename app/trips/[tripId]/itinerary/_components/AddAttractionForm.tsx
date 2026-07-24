"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { CATEGORIES, CATEGORY_META } from "@/lib/categories";
import { addAttraction, addUnscheduledAttraction } from "../actions";
import {
  PlaceAutocomplete,
  type PlaceSearchBias,
} from "./PlaceAutocomplete";
import { IconAdd } from "@/components/icons";
import type { Category } from "@/app/generated/prisma/client";

export function AddAttractionForm({
  tripId,
  dayIndex,
  fixedCategory,
  searchBias,
  insertAfterId,
  variant = "default",
}: {
  tripId: string;
  searchBias?: PlaceSearchBias;
  insertAfterId?: string;
  variant?: "default" | "between";
} & (
  | { dayIndex: number; fixedCategory?: undefined }
  | { dayIndex?: undefined; fixedCategory: Category }
)) {
  const [isOpen, setIsOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const action =
    dayIndex !== undefined
      ? addAttraction.bind(null, tripId, dayIndex)
      : addUnscheduledAttraction.bind(null, tripId, fixedCategory);

  if (!isOpen) {
    if (variant === "between") {
      return (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Add a place here"
          className="group flex w-full items-center gap-2 py-0.5 text-foreground-muted"
        >
          <span className="h-px flex-1 bg-border/70 transition-colors group-hover:bg-primary/40" />
          <span className="flex h-7 items-center gap-1 rounded-full border border-border bg-background px-2.5 text-[0.65rem] font-bold tracking-wide transition-colors group-hover:border-primary/50 group-hover:text-primary">
            <IconAdd size={13} />
            Add here
          </span>
          <span className="h-px flex-1 bg-border/70 transition-colors group-hover:bg-primary/40" />
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border py-3 text-center text-sm font-bold text-foreground-muted"
      >
        <IconAdd size={16} />
        Add place
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await action(formData);
        formRef.current?.reset();
        setIsOpen(false);
      }}
      className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4"
    >
      {insertAfterId && (
        <input type="hidden" name="insertAfterId" value={insertAfterId} />
      )}
      <PlaceAutocomplete searchBias={searchBias} />
      <div className="flex gap-2">
        {dayIndex !== undefined && (
          <select
            name="category"
            defaultValue="SIGHTSEEING"
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_META[c].label}
              </option>
            ))}
          </select>
        )}
        <input
          type="time"
          name="time"
          className="w-28 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </div>
      <textarea
        name="notes"
        placeholder="Notes (optional)"
        rows={2}
        className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
      />
      <input
        type="file"
        name="photo"
        accept="image/*"
        className="text-xs file:mr-2 file:rounded-full file:border-0 file:bg-primary file:px-2 file:py-1 file:text-xs file:font-bold file:text-primary-foreground"
      />
      <AddFormActions onCancel={() => setIsOpen(false)} />
    </form>
  );
}

function AddFormActions({ onCancel }: { onCancel: () => void }) {
  const { pending } = useFormStatus();

  return (
    <div className="mt-1 flex gap-2">
      <button
        type="submit"
        disabled={pending}
        aria-live="polite"
        className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:cursor-wait disabled:opacity-80"
      >
        {pending && (
          <span
            aria-hidden
            className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
        )}
        {pending ? "Adding…" : "Add"}
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={pending}
        className="rounded-full border border-border px-4 py-2 text-sm font-bold disabled:opacity-50"
      >
        Cancel
      </button>
    </div>
  );
}
