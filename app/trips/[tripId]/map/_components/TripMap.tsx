"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { CATEGORY_META } from "@/lib/categories";
import { IconClose } from "@/components/icons";
import type { Category } from "@/app/generated/prisma/client";

type MappableAttraction = {
  id: string;
  name: string;
  category: Category;
  dayIndex: number | null;
  routeOrder: number;
  lat: number;
  lng: number;
  time: string | null;
  address: string | null;
  notes: string | null;
  photoUrl: string | null;
};

const ArcgisMapCanvas = dynamic(
  () => import("./ArcgisMapCanvas").then((mod) => mod.ArcgisMapCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 flex items-center justify-center bg-surface-muted">
        <p className="text-sm font-light text-foreground-muted">Loading map…</p>
      </div>
    ),
  }
);

export function TripMap({
  attractions,
  apiKey,
}: {
  attractions: MappableAttraction[];
  apiKey: string;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const byId = useMemo(() => new Map(attractions.map((a) => [a.id, a])), [attractions]);
  const selected = selectedId ? byId.get(selectedId) : null;

  return (
    <div className="relative flex-1">
      <ArcgisMapCanvas attractions={attractions} apiKey={apiKey} onSelect={setSelectedId} />
      {selected && <DetailSheet attraction={selected} onClose={() => setSelectedId(null)} />}
    </div>
  );
}

function DetailSheet({
  attraction,
  onClose,
}: {
  attraction: MappableAttraction;
  onClose: () => void;
}) {
  const meta = CATEGORY_META[attraction.category];
  const Icon = meta.icon;

  return (
    <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-2 rounded-t-3xl border-t border-border bg-surface p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] shadow-2xl">
      <div className="mx-auto -mt-1.5 mb-1 h-1 w-9 rounded-full bg-border" aria-hidden />
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-bold text-foreground-muted">
            <Icon size={13} style={{ color: meta.color }} />
            Stop {String(attraction.routeOrder).padStart(2, "0")} · {meta.label}
            {attraction.time ? ` · ${attraction.time}` : ""}
          </p>
          <p className="mt-0.5 text-lg font-bold leading-tight">{attraction.name}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border"
          aria-label="Close"
        >
          <IconClose size={16} />
        </button>
      </div>
      {attraction.address && (
        <p className="text-sm font-light text-foreground-muted">{attraction.address}</p>
      )}
      {attraction.notes && (
        <p className="text-sm font-light text-foreground-muted">{attraction.notes}</p>
      )}
    </div>
  );
}
