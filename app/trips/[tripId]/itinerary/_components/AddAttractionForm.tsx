"use client";

import { useRef, useState } from "react";
import { CATEGORIES, CATEGORY_META } from "@/lib/categories";
import { addAttraction, addUnscheduledAttraction } from "../actions";
import { PlaceAutocomplete } from "./PlaceAutocomplete";
import { IconAdd } from "@/components/icons";
import type { Category } from "@/app/generated/prisma/client";

export function AddAttractionForm({
  tripId,
  dayIndex,
  fixedCategory,
}: {
  tripId: string;
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
      <PlaceAutocomplete />
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
      <div className="mt-1 flex gap-2">
        <button
          type="submit"
          className="flex-1 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
        >
          Add
        </button>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="rounded-full border border-border px-4 py-2 text-sm font-bold"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
