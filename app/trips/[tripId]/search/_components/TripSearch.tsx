"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { CATEGORIES, CATEGORY_META } from "@/lib/categories";
import { addUnscheduledAttraction } from "../../itinerary/actions";
import {
  IconAdd,
  IconClose,
  IconMap,
  IconSearch,
} from "@/components/icons";
import type { Category } from "@/app/generated/prisma/client";

type ExternalSuggestion =
  | {
      id: string;
      source: "geocode";
      text: string;
      subtitle: string;
      magicKey: string;
    }
  | {
      id: string;
      source: "places";
      text: string;
      subtitle: string;
      placeId: string;
    }
  | {
      id: string;
      source: "google";
      text: string;
      subtitle: string;
      placeId: string;
    };

type ResolvedExternalPlace = {
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
};

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
  canEdit,
  searchBias,
}: {
  tripId: string;
  items: TripSearchItem[];
  canEdit: boolean;
  searchBias?: { lat: number; lng: number };
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "ALL">("ALL");
  const [city, setCity] = useState("ALL");
  const [externalSearch, setExternalSearch] = useState<{
    query: string;
    suggestions: ExternalSuggestion[];
  }>({ query: "", suggestions: [] });
  const [isDiscovering, setIsDiscovering] = useState(false);
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

  const queryMatches = useMemo(() => {
    const search = normalized(deferredQuery);
    return items.filter((item) => {
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
  }, [deferredQuery, items]);

  const results = useMemo(
    () =>
      queryMatches.filter(
        (item) =>
          (category === "ALL" || item.category === category) &&
          (city === "ALL" || item.city === city)
      ),
    [category, city, queryMatches]
  );

  useEffect(() => {
    const search = deferredQuery.trim();
    if (search.length < 2 || queryMatches.length > 0) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsDiscovering(true);
      setExternalSearch({ query: search, suggestions: [] });

      const bias = searchBias
        ? `&lat=${encodeURIComponent(searchBias.lat)}&lng=${encodeURIComponent(searchBias.lng)}`
        : "";
      const fetchSuggestions = async (field: "name" | "address") => {
        const response = await fetch(
          `/api/places/suggest?q=${encodeURIComponent(search)}&field=${field}${bias}`,
          { signal: controller.signal }
        );
        if (!response.ok) return [];
        const data = (await response.json()) as {
          suggestions?: ExternalSuggestion[];
        };
        return data.suggestions ?? [];
      };

      try {
        const nameResults = await fetchSuggestions("name");
        const suggestions =
          nameResults.length > 0
            ? nameResults
            : await fetchSuggestions("address");
        setExternalSearch({ query: search, suggestions });
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setExternalSearch({ query: search, suggestions: [] });
        }
      } finally {
        if (!controller.signal.aborted) setIsDiscovering(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [deferredQuery, queryMatches.length, searchBias]);

  const externalQuery = deferredQuery.trim();
  const externalResults =
    externalSearch.query === externalQuery ? externalSearch.suggestions : [];
  const externalIsLoading =
    isDiscovering || externalSearch.query !== externalQuery;

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

        {results.length === 0 && queryMatches.length > 0 && (
          <div className="rounded-2xl border border-dashed border-border px-6 py-10 text-center">
            <p className="font-bold">Matches are hidden by your filters</p>
            <p className="mt-1 text-sm font-light text-foreground-muted">
              Clear the filters to see places already in this trip.
            </p>
          </div>
        )}

        {deferredQuery.trim().length >= 2 && queryMatches.length === 0 && (
          <ExternalDiscovery
            tripId={tripId}
            query={deferredQuery}
            suggestions={externalResults}
            isLoading={externalIsLoading}
            canEdit={canEdit}
            searchBias={searchBias}
          />
        )}
      </section>
    </div>
  );
}

function ExternalDiscovery({
  tripId,
  query,
  suggestions,
  isLoading,
  canEdit,
  searchBias,
}: {
  tripId: string;
  query: string;
  suggestions: ExternalSuggestion[];
  isLoading: boolean;
  canEdit: boolean;
  searchBias?: { lat: number; lng: number };
}) {
  return (
    <div className="mt-1 flex flex-col gap-3 border-t border-border pt-5">
      <div>
        <p className="font-mono text-[0.65rem] font-bold tracking-[0.18em] text-foreground-muted uppercase">
          Discover a new place
        </p>
        <h2 className="mt-1 text-lg font-bold">
          Not in your trip yet
        </h2>
        <p className="text-sm font-light text-foreground-muted">
          Searching Google Places, with ArcGIS as backup.
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-5 text-sm text-foreground-muted">
          <span
            aria-hidden
            className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
          Looking for “{query.trim()}”…
        </div>
      )}

      {!isLoading &&
        suggestions.map((suggestion) => (
          <ExternalResult
            key={suggestion.id}
            tripId={tripId}
            suggestion={suggestion}
            canEdit={canEdit}
            searchBias={searchBias}
          />
        ))}

      {!isLoading && suggestions.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border px-6 py-8 text-center">
          <p className="font-bold">No place found</p>
          <p className="mt-1 text-sm font-light text-foreground-muted">
            Try a more specific place name or complete address.
          </p>
        </div>
      )}
    </div>
  );
}

function inferredCategory(suggestion: ExternalSuggestion): Category {
  const text = normalized(`${suggestion.text} ${suggestion.subtitle}`);
  if (/(restaurant|ramen|cafe|coffee|bar|food|bakery)/.test(text)) return "FOOD";
  if (/(hotel|hostel|lodging|accommodation)/.test(text)) return "LODGING";
  if (/(shop|shopping|store|mall|market)/.test(text)) return "SHOPPING";
  if (/(station|airport|transit|train|bus|transport)/.test(text)) return "TRANSPORT";
  if (/(museum|temple|shrine|park|landmark|attraction|sight)/.test(text)) {
    return "SIGHTSEEING";
  }
  return "OTHER";
}

function ExternalResult({
  tripId,
  suggestion,
  canEdit,
  searchBias,
}: {
  tripId: string;
  suggestion: ExternalSuggestion;
  canEdit: boolean;
  searchBias?: { lat: number; lng: number };
}) {
  const [resolved, setResolved] = useState<ResolvedExternalPlace | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  async function prepareToAdd() {
    setIsResolving(true);
    const bias = searchBias
      ? `&lat=${encodeURIComponent(searchBias.lat)}&lng=${encodeURIComponent(searchBias.lng)}`
      : "";
    let params: string;
    if (suggestion.source === "google") {
      params = `source=google&placeId=${encodeURIComponent(suggestion.placeId)}&text=${encodeURIComponent(suggestion.text)}${bias}`;
    } else if (suggestion.source === "places") {
      params = `placeId=${encodeURIComponent(suggestion.placeId)}`;
    } else {
      params = `text=${encodeURIComponent(suggestion.text)}&magicKey=${encodeURIComponent(suggestion.magicKey)}${bias}`;
    }

    try {
      const response = await fetch(`/api/places/resolve?${params}`);
      const place = response.ok
        ? ((await response.json()) as ResolvedExternalPlace | null)
        : null;
      setResolved(
        place ?? {
          name: suggestion.text.split(",")[0],
          address: suggestion.text,
          lat: null,
          lng: null,
        }
      );
    } finally {
      setIsResolving(false);
    }
  }

  return (
    <article className="rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-muted text-primary">
          <IconSearch size={17} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold leading-tight">{suggestion.text}</h3>
          <p className="mt-1 text-xs font-light text-foreground-muted">
            {suggestion.subtitle}
          </p>
          <p className="mt-1 font-mono text-[0.58rem] font-bold tracking-widest text-foreground-muted uppercase">
            {suggestion.source === "google" ? "Google Places" : "ArcGIS"}
          </p>
        </div>
      </div>

      {!canEdit && (
        <p className="mt-3 rounded-xl bg-surface-muted px-3 py-2 text-xs text-foreground-muted">
          An owner or editor can add this place.
        </p>
      )}

      {canEdit && !resolved && (
        <button
          type="button"
          onClick={prepareToAdd}
          disabled={isResolving}
          className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-full border border-border text-xs font-bold text-primary disabled:cursor-wait disabled:opacity-70"
        >
          {isResolving ? (
            <span
              aria-hidden
              className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
            />
          ) : (
            <IconAdd size={15} />
          )}
          {isResolving ? "Getting place details…" : "Add to trip"}
        </button>
      )}

      {canEdit && resolved && (
        <form
          action={async (formData) => {
            const selectedCategory = formData.get("category") as Category;
            await addUnscheduledAttraction(
              tripId,
              selectedCategory,
              formData
            );
          }}
          className="mt-3 flex flex-col gap-2 border-t border-border pt-3"
        >
          <input type="hidden" name="name" value={resolved.name} />
          <input type="hidden" name="address" value={resolved.address} />
          <input type="hidden" name="lat" value={resolved.lat ?? ""} />
          <input type="hidden" name="lng" value={resolved.lng ?? ""} />
          <label className="flex items-center gap-3">
            <span className="text-xs font-bold text-foreground-muted">
              Type
            </span>
            <select
              name="category"
              defaultValue={inferredCategory(suggestion)}
              className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-sm font-bold"
            >
              {CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {CATEGORY_META[value].label}
                </option>
              ))}
            </select>
          </label>
          <ExternalAddButton />
          <p className="text-center text-[0.68rem] font-light text-foreground-muted">
            Added to Stats without assigning a day.
          </p>
        </form>
      )}
    </article>
  );
}

function ExternalAddButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-10 items-center justify-center gap-2 rounded-full bg-primary text-sm font-bold text-primary-foreground disabled:cursor-wait disabled:opacity-75"
    >
      {pending && (
        <span
          aria-hidden
          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {pending ? "Adding…" : "Add to Stats"}
    </button>
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
