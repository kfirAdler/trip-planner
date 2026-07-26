"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { CATEGORIES, CATEGORY_META } from "@/lib/categories";
import {
  IconClose,
  IconMap,
  IconSearch,
} from "@/components/icons";
import type { Category } from "@/app/generated/prisma/client";

export type TripSearchItem = {
  id: string;
  name: string;
  address: string | null;
  category: Category;
  city: string | null;
  dayIndex: number | null;
  dayLabel: string | null;
  stopNumber: number | null;
  time: string | null;
  mappable: boolean;
};

function normalized(value: string) {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase()
    .trim();
}

export function TripSearch({
  tripId,
  items,
}: {
  tripId: string;
  items: TripSearchItem[];
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "ALL">("ALL");
  const [city, setCity] = useState("ALL");
  const deferredQuery = useDeferredValue(query);

  const availableCategories = useMemo(
    () => CATEGORIES.filter((value) => items.some((item) => item.category === value)),
    [items]
  );
  const cities = useMemo(
    () =>
      Array.from(
        new Set(items.map((item) => item.city).filter((value): value is string => Boolean(value)))
      ).sort((a, b) => a.localeCompare(b)),
    [items]
  );

  const results = useMemo(() => {
    const search = normalized(deferredQuery);
    return items.filter((item) => {
      if (category !== "ALL" && item.category !== category) return false;
      if (city !== "ALL" && item.city !== city) return false;
      if (!search) return true;

      const meta = CATEGORY_META[item.category];
      return normalized(
        [
          item.name,
          item.address,
          item.city,
          meta.label,
          item.dayLabel,
        ]
          .filter(Boolean)
          .join(" ")
      ).includes(search);
    });
  }, [category, city, deferredQuery, items]);

  const hasFilters = category !== "ALL" || city !== "ALL";

  return (
    <div className="flex flex-1 flex-col gap-5 px-5 pt-[calc(env(safe-area-inset-top)+2rem)]">
      <header>
        <p className="font-mono text-[0.65rem] font-bold tracking-[0.2em] text-foreground-muted uppercase">
          Trip directory
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Search</h1>
        <p className="mt-1 text-sm font-light text-foreground-muted">
          Find any saved place by name or address.
        </p>
      </header>

      <div className="sticky top-0 z-10 -mx-1 flex flex-col gap-3 bg-background/95 px-1 pb-3 backdrop-blur">
        <label className="relative block">
          <span className="sr-only">Search saved trip places</span>
          <IconSearch
            size={19}
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-foreground-muted"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Place or address"
            autoComplete="off"
            className="h-12 w-full rounded-2xl border border-border bg-surface pr-11 pl-11 text-base shadow-[var(--shadow-card)] outline-none transition-colors placeholder:text-foreground-muted focus:border-primary"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute top-1/2 right-2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-foreground-muted"
            >
              <IconClose size={17} />
            </button>
          )}
        </label>

        <div
          className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Filter by type"
        >
          <FilterChip
            active={category === "ALL"}
            onClick={() => setCategory("ALL")}
          >
            All types
          </FilterChip>
          {availableCategories.map((value) => {
            const meta = CATEGORY_META[value];
            return (
              <FilterChip
                key={value}
                active={category === value}
                onClick={() => setCategory(value)}
              >
                <meta.icon size={13} style={{ color: meta.color }} aria-hidden />
                {meta.label}
              </FilterChip>
            );
          })}
        </div>

        {cities.length > 0 && (
          <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-3">
            <span className="font-mono text-[0.65rem] font-bold tracking-widest text-foreground-muted uppercase">
              City
            </span>
            <select
              value={city}
              onChange={(event) => setCity(event.target.value)}
              className="h-10 min-w-0 flex-1 bg-transparent text-right text-sm font-bold outline-none"
            >
              <option value="ALL">All cities</option>
              {cities.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <section className="flex flex-col gap-3 pb-5" aria-live="polite">
        <div className="flex items-center justify-between">
          <p className="font-mono text-xs font-bold tabular-nums text-foreground-muted">
            {String(results.length).padStart(2, "0")}{" "}
            {results.length === 1 ? "result" : "results"}
          </p>
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setCategory("ALL");
                setCity("ALL");
              }}
              className="text-xs font-bold text-primary"
            >
              Clear filters
            </button>
          )}
        </div>

        {results.map((item) => (
          <SearchResult key={item.id} tripId={tripId} item={item} />
        ))}

        {results.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border px-6 py-10 text-center">
            <p className="font-bold">No saved places found</p>
            <p className="mt-1 text-sm font-light text-foreground-muted">
              Try another name, address, city, or type.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={[
        "flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-bold transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-surface text-foreground",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function SearchResult({
  tripId,
  item,
}: {
  tripId: string;
  item: TripSearchItem;
}) {
  const meta = CATEGORY_META[item.category];

  return (
    <article className="card-elevated relative overflow-hidden rounded-2xl border border-border bg-surface p-4">
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-1"
        style={{ background: meta.color }}
      />
      <div className="flex items-start gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-muted"
          style={{ color: meta.color }}
        >
          <meta.icon size={18} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h2 className="text-base font-bold leading-tight">{item.name}</h2>
            <span className="rounded-full bg-surface-muted px-2 py-0.5 font-mono text-[0.58rem] font-bold tracking-wide text-foreground-muted uppercase">
              In itinerary
            </span>
          </div>
          <p className="mt-1 text-xs font-bold" style={{ color: meta.color }}>
            {meta.label}
            {item.city ? ` · ${item.city}` : ""}
          </p>
          {item.address && (
            <p className="mt-1 line-clamp-2 text-sm font-light text-foreground-muted">
              {item.address}
            </p>
          )}
          <p className="mt-2 font-mono text-[0.68rem] font-bold tabular-nums text-foreground-muted">
            {item.dayIndex === null
              ? "Not scheduled"
              : `Day ${String(item.dayIndex + 1).padStart(2, "0")} · ${item.dayLabel}`}
            {item.stopNumber !== null
              ? ` · Stop ${String(item.stopNumber).padStart(2, "0")}`
              : ""}
            {item.time ? ` · ${item.time}` : ""}
          </p>
        </div>
      </div>

      {item.mappable && (
        <Link
          href={`/trips/${tripId}/map?place=${encodeURIComponent(item.id)}`}
          className="pressable mt-3 flex h-9 items-center justify-center gap-2 rounded-full border border-border text-xs font-bold text-primary"
        >
          <IconMap size={15} />
          Go to map
        </Link>
      )}
    </article>
  );
}
