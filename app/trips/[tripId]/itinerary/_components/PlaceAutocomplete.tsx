"use client";

import { useEffect, useRef, useState } from "react";

type Suggestion = { text: string; magicKey: string };
type SearchField = "name" | "address";

export type PlaceSearchBias = {
  lat: number;
  lng: number;
  label?: string;
};

export function PlaceAutocomplete({
  defaultName = "",
  defaultAddress = "",
  defaultLat,
  defaultLng,
  searchBias,
}: {
  defaultName?: string;
  defaultAddress?: string;
  defaultLat?: number | null;
  defaultLng?: number | null;
  searchBias?: PlaceSearchBias;
}) {
  const [name, setName] = useState(defaultName);
  const [address, setAddress] = useState(defaultAddress);
  const [lat, setLat] = useState(defaultLat != null ? String(defaultLat) : "");
  const [lng, setLng] = useState(defaultLng != null ? String(defaultLng) : "");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [activeField, setActiveField] = useState<SearchField | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setActiveField(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function biasParams() {
    if (!searchBias) return "";
    return `&lat=${encodeURIComponent(searchBias.lat)}&lng=${encodeURIComponent(searchBias.lng)}`;
  }

  function handleSearch(field: SearchField, value: string) {
    if (field === "name") setName(value);
    else setAddress(value);

    setActiveField(field);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const requestId = ++requestIdRef.current;
      try {
        const response = await fetch(
          `/api/places/suggest?q=${encodeURIComponent(value)}${biasParams()}`
        );
        if (!response.ok) return;
        const data = await response.json();
        if (requestId !== requestIdRef.current) return;
        setSuggestions(data.suggestions ?? []);
        setActiveField(field);
      } catch {
        // Search is a convenience on top of free typing.
      }
    }, 300);
  }

  async function handleSelect(suggestion: Suggestion) {
    setActiveField(null);
    setSuggestions([]);
    setName(suggestion.text.split(",")[0]);
    setAddress(suggestion.text);
    setIsResolving(true);

    try {
      const response = await fetch(
        `/api/places/resolve?text=${encodeURIComponent(suggestion.text)}&magicKey=${encodeURIComponent(suggestion.magicKey)}${biasParams()}`
      );
      if (!response.ok) return;

      const place = await response.json();
      if (place) {
        if (place.name) setName(place.name);
        if (place.address) setAddress(place.address);
        setLat(place.lat != null ? String(place.lat) : "");
        setLng(place.lng != null ? String(place.lng) : "");
      }
    } finally {
      setIsResolving(false);
    }
  }

  function suggestionList(field: SearchField) {
    if (activeField !== field || suggestions.length === 0) return null;

    return (
      <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-border bg-surface shadow-lg">
        {suggestions.map((suggestion) => (
          <li key={suggestion.magicKey}>
            <button
              type="button"
              onClick={() => handleSelect(suggestion)}
              className="block w-full px-3 py-2 text-left text-sm active:bg-surface-muted"
            >
              {suggestion.text}
            </button>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div ref={containerRef} className="flex flex-col gap-3">
      {searchBias && (
        <p className="-mb-1 text-xs font-light text-foreground-muted">
          Results prioritized near{" "}
          <span className="font-bold">{searchBias.label ?? "the previous place"}</span>
        </p>
      )}

      <div className="relative">
        <input
          name="name"
          required
          maxLength={120}
          placeholder="Place name"
          autoComplete="off"
          value={name}
          onChange={(event) => handleSearch("name", event.target.value)}
          onFocus={() => suggestions.length > 0 && setActiveField("name")}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-bold"
        />
        {isResolving && (
          <span className="absolute top-1/2 right-3 -translate-y-1/2 text-xs text-foreground-muted">
            …
          </span>
        )}
        {suggestionList("name")}
      </div>

      <div className="relative">
        <input
          name="address"
          placeholder="Search address (optional)"
          autoComplete="off"
          value={address}
          onChange={(event) => handleSearch("address", event.target.value)}
          onFocus={() => suggestions.length > 0 && setActiveField("address")}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        {suggestionList("address")}
      </div>

      {/* Coordinates are map metadata populated by ArcGIS. They still submit
          with the form, but aren't useful editing controls for travelers. */}
      <input name="lat" type="hidden" value={lat} readOnly />
      <input name="lng" type="hidden" value={lng} readOnly />
    </div>
  );
}
