"use client";

import { useEffect, useRef, useState } from "react";

type Suggestion = { text: string; magicKey: string };

export function PlaceAutocomplete({
  defaultName = "",
  defaultAddress = "",
  defaultLat,
  defaultLng,
}: {
  defaultName?: string;
  defaultAddress?: string;
  defaultLat?: number | null;
  defaultLng?: number | null;
}) {
  const [name, setName] = useState(defaultName);
  const [address, setAddress] = useState(defaultAddress);
  const [lat, setLat] = useState(defaultLat != null ? String(defaultLat) : "");
  const [lng, setLng] = useState(defaultLng != null ? String(defaultLng) : "");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleNameChange(value: string) {
    setName(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/places/suggest?q=${encodeURIComponent(value)}`);
        if (!res.ok) return;
        const data = await res.json();
        setSuggestions(data.suggestions ?? []);
        setIsOpen(true);
      } catch {
        // Search is a convenience on top of free typing — ignore network errors.
      }
    }, 300);
  }

  async function handleSelect(suggestion: Suggestion) {
    setIsOpen(false);
    setSuggestions([]);
    // Suggestion text is a full breadcrumb ("Sensoji Temple, Taito, Tokyo,
    // JPN") — good as the address line, too long for the name field. Use the
    // resolved candidate's (usually shorter) label for name instead, once it
    // comes back below.
    setName(suggestion.text.split(",")[0]);
    setAddress(suggestion.text);
    setIsResolving(true);
    try {
      const res = await fetch(
        `/api/places/resolve?text=${encodeURIComponent(suggestion.text)}&magicKey=${encodeURIComponent(suggestion.magicKey)}`
      );
      if (res.ok) {
        const place = await res.json();
        if (place) {
          if (place.label) setName(place.label);
          setLat(place.lat != null ? String(place.lat) : "");
          setLng(place.lng != null ? String(place.lng) : "");
        }
      }
    } finally {
      setIsResolving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div ref={containerRef} className="relative">
        <input
          name="name"
          required
          maxLength={120}
          placeholder="Place name"
          autoComplete="off"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-bold"
        />
        {isResolving && (
          <span className="absolute top-1/2 right-3 -translate-y-1/2 text-xs text-foreground-muted">
            …
          </span>
        )}
        {isOpen && suggestions.length > 0 && (
          <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
            {suggestions.map((s) => (
              <li key={s.magicKey}>
                <button
                  type="button"
                  onClick={() => handleSelect(s)}
                  className="block w-full px-3 py-2 text-left text-sm active:bg-surface-muted"
                >
                  {s.text}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <input
        name="address"
        placeholder="Address (optional)"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
      />
      <div className="flex gap-2">
        <input
          name="lat"
          type="number"
          step="any"
          placeholder="Latitude (optional)"
          value={lat}
          onChange={(e) => setLat(e.target.value)}
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <input
          name="lng"
          type="number"
          step="any"
          placeholder="Longitude (optional)"
          value={lng}
          onChange={(e) => setLng(e.target.value)}
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </div>
    </div>
  );
}
