"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { CATEGORY_META } from "@/lib/categories";
import {
  IconBack,
  IconChevronRight,
  IconClose,
  IconGlobe,
  IconMap,
  IconNavigation,
  IconPin,
  IconSatellite,
} from "@/components/icons";
import type { MapBasemap, NearbyPlace } from "./ArcgisMapCanvas";
import type { Category } from "@/app/generated/prisma/client";

type MapProvider = "arcgis" | "google-beta";

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

export type UserLocation = {
  lat: number;
  lng: number;
  accuracy: number;
};

const LOCATION_REQUESTED_KEY = "trip-planner-location-requested";
const LOCATION_ACCESS_KEY = "trip-planner-location-access";
const LOCATION_CACHE_KEY = "trip-planner-last-location";

function googleMapsDirectionsUrl(
  origin: UserLocation | null,
  destination: string
) {
  const params = new URLSearchParams({
    api: "1",
    destination,
    dir_action: "navigate",
  });
  if (origin) {
    params.set("origin", `${origin.lat},${origin.lng}`);
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

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

const GoogleMapCanvas = dynamic(
  () => import("./GoogleMapCanvas").then((mod) => mod.GoogleMapCanvas),
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
  googleApiKey,
  initialCenter,
}: {
  attractions: MappableAttraction[];
  apiKey: string;
  googleApiKey?: string;
  initialCenter?: { lat: number; lng: number };
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedNearby, setSelectedNearby] = useState<NearbyPlace | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locateRequest, setLocateRequest] = useState(0);
  const [basemap, setBasemap] = useState<MapBasemap>("streets");
  // ArcGIS stays the default, existing behavior — Google is an opt-in
  // (beta) alternative the traveler can switch to and back at will.
  const [mapProvider, setMapProvider] = useState<MapProvider>("arcgis");
  const byId = useMemo(() => new Map(attractions.map((a) => [a.id, a])), [attractions]);
  const selected = selectedId ? byId.get(selectedId) : null;
  const selectedIndex = selected
    ? attractions.findIndex((attraction) => attraction.id === selected.id)
    : -1;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousOverscrollBehavior = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscrollBehavior;
    };
  }, []);

  useEffect(() => {
    if (!("geolocation" in navigator)) return;

    let cancelled = false;
    let watchId: number | null = null;

    const readCachedLocation = () => {
      try {
        const cached = JSON.parse(
          localStorage.getItem(LOCATION_CACHE_KEY) ?? "null"
        ) as UserLocation | null;
        if (
          cached &&
          Number.isFinite(cached.lat) &&
          Number.isFinite(cached.lng)
        ) {
          setUserLocation(cached);
        }
      } catch {
        localStorage.removeItem(LOCATION_CACHE_KEY);
      }
    };

    const startWatching = () => {
      if (cancelled) return;
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          if (cancelled) return;
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          setUserLocation(location);
          localStorage.setItem(LOCATION_ACCESS_KEY, "granted");
          localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(location));
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            localStorage.setItem(LOCATION_ACCESS_KEY, "denied");
            localStorage.removeItem(LOCATION_CACHE_KEY);
          }
        },
        {
          enableHighAccuracy: true,
          maximumAge: 15000,
          timeout: 12000,
        }
      );
    };

    const initializeLocation = async () => {
      const requested = localStorage.getItem(LOCATION_REQUESTED_KEY) === "true";
      const savedAccess = localStorage.getItem(LOCATION_ACCESS_KEY);

      if (savedAccess === "granted") readCachedLocation();

      if ("permissions" in navigator) {
        try {
          const permission = await navigator.permissions.query({
            name: "geolocation",
          });
          if (cancelled) return;
          if (permission.state === "denied") {
            localStorage.setItem(LOCATION_ACCESS_KEY, "denied");
            return;
          }
          if (permission.state === "granted") {
            localStorage.setItem(LOCATION_ACCESS_KEY, "granted");
            startWatching();
            return;
          }
          if (permission.state === "prompt" && requested) return;
        } catch {
          // Safari versions without the geolocation Permissions API use the
          // saved choice and browser-managed permission below.
        }
      }

      if (savedAccess === "denied") return;
      if (!("permissions" in navigator) && requested && savedAccess !== "granted") {
        return;
      }

      localStorage.setItem(LOCATION_REQUESTED_KEY, "true");
      startWatching();
    };

    initializeLocation();

    return () => {
      cancelled = true;
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  function selectAt(index: number) {
    const attraction = attractions[index];
    if (attraction) {
      setSelectedNearby(null);
      setSelectedId(attraction.id);
    }
  }

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden">
      {mapProvider === "google-beta" && googleApiKey ? (
        <GoogleMapCanvas
          attractions={attractions}
          apiKey={googleApiKey}
          initialCenter={initialCenter}
          userLocation={userLocation}
          locateRequest={locateRequest}
          selectedId={selectedId}
          onSelect={(id) => {
            if (id) setSelectedNearby(null);
            setSelectedId(id);
          }}
        />
      ) : (
        <ArcgisMapCanvas
          attractions={attractions}
          apiKey={apiKey}
          initialCenter={initialCenter}
          userLocation={userLocation}
          locateRequest={locateRequest}
          basemap={basemap}
          selectedId={selectedId}
          selectedNearby={selectedNearby}
          onSelect={(id) => {
            if (id) setSelectedNearby(null);
            setSelectedId(id);
          }}
          onNearbySelect={(place) => {
            if (place) setSelectedId(null);
            setSelectedNearby(place);
          }}
        />
      )}
      {googleApiKey && (
        <button
          type="button"
          onClick={() => {
            setSelectedId(null);
            setSelectedNearby(null);
            setMapProvider((current) =>
              current === "arcgis" ? "google-beta" : "arcgis"
            );
          }}
          aria-label={
            mapProvider === "arcgis"
              ? "Switch to Google Maps (beta)"
              : "Switch to the default map"
          }
          className="absolute left-4 top-[calc(env(safe-area-inset-top)+4.25rem)] z-10 flex h-10 items-center gap-2 rounded-full border border-border bg-surface/95 px-3 text-xs font-bold text-foreground shadow-lg backdrop-blur transition-transform active:scale-95"
        >
          {mapProvider === "arcgis" ? (
            <>
              <IconGlobe size={16} />
              Google (beta)
            </>
          ) : (
            <>
              <IconMap size={16} />
              Map
            </>
          )}
        </button>
      )}
      {mapProvider === "arcgis" && (
        <button
          type="button"
          onClick={() =>
            setBasemap((current) =>
              current === "streets" ? "satellite" : "streets"
            )
          }
          aria-label={
            basemap === "streets"
              ? "Switch to satellite view"
              : "Switch to street map"
          }
          className="absolute right-4 top-[calc(env(safe-area-inset-top)+4.25rem)] z-10 flex h-10 items-center gap-2 rounded-full border border-border bg-surface/95 px-3 text-xs font-bold text-foreground shadow-lg backdrop-blur transition-transform active:scale-95"
        >
          {basemap === "streets" ? (
            <>
              <IconSatellite size={16} />
              Satellite
            </>
          ) : (
            <>
              <IconMap size={16} />
              Map
            </>
          )}
        </button>
      )}
      {userLocation && !selected && !selectedNearby && (
        <button
          type="button"
          onClick={() => setLocateRequest((request) => request + 1)}
          aria-label="Go to my location"
          className="absolute right-4 bottom-[calc(env(safe-area-inset-bottom)+5rem)] z-10 flex h-14 w-14 items-center justify-center rounded-full border border-border bg-surface text-foreground shadow-xl transition-transform active:scale-95"
        >
          <IconNavigation size={26} fill="currentColor" />
        </button>
      )}
      {selected && (
        <DetailSheet
          attraction={selected}
          userLocation={userLocation}
          canGoBack={selectedIndex > 0}
          canGoNext={selectedIndex < attractions.length - 1}
          onBack={() => selectAt(selectedIndex - 1)}
          onNext={() => selectAt(selectedIndex + 1)}
          onClose={() => setSelectedId(null)}
        />
      )}
      {selectedNearby && (
        <NearbyDetailSheet
          key={selectedNearby.placeId}
          place={selectedNearby}
          userLocation={userLocation}
          onClose={() => setSelectedNearby(null)}
        />
      )}
    </div>
  );
}

function NearbyDetailSheet({
  place,
  userLocation,
  onClose,
}: {
  place: NearbyPlace;
  userLocation: UserLocation | null;
  onClose: () => void;
}) {
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/places/resolve?placeId=${encodeURIComponent(place.placeId)}`, {
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((result) => setAddress(result?.address || null))
      .catch(() => {});

    return () => controller.abort();
  }, [place.placeId]);

  return (
    <div className="map-detail-sheet absolute inset-x-0 bottom-0 z-10 flex max-h-[min(60%,28rem)] flex-col gap-2 overflow-y-auto overscroll-contain rounded-t-3xl border-t border-border bg-surface p-5 pb-5 shadow-2xl">
      <div className="mx-auto -mt-1.5 mb-1 h-1 w-9 rounded-full bg-border" aria-hidden />
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-bold text-foreground-muted">
            <IconPin size={13} className="text-primary" />
            Nearby place · {place.category}
          </p>
          <p className="mt-0.5 text-lg font-bold leading-tight">{place.name}</p>
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
      {address ? (
        <p className="text-sm font-light text-foreground-muted">{address}</p>
      ) : (
        <p className="text-xs font-light text-foreground-muted">Loading address…</p>
      )}
      <a
        href={googleMapsDirectionsUrl(userLocation, address || place.name)}
        target="_blank"
        rel="noreferrer"
        className="mt-2 flex h-10 items-center justify-center gap-2 rounded-full bg-primary text-sm font-bold text-primary-foreground"
      >
        <IconNavigation size={16} />
        Navigate with Google Maps
      </a>
    </div>
  );
}

function DetailSheet({
  attraction,
  userLocation,
  canGoBack,
  canGoNext,
  onBack,
  onNext,
  onClose,
}: {
  attraction: MappableAttraction;
  userLocation: UserLocation | null;
  canGoBack: boolean;
  canGoNext: boolean;
  onBack: () => void;
  onNext: () => void;
  onClose: () => void;
}) {
  const meta = CATEGORY_META[attraction.category];
  const Icon = meta.icon;

  return (
    <div className="map-detail-sheet absolute inset-x-0 bottom-0 z-10 flex max-h-[min(60%,28rem)] flex-col gap-2 overflow-y-auto overscroll-contain rounded-t-3xl border-t border-border bg-surface p-5 pb-5 shadow-2xl">
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
      <div className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
        <a
          href={googleMapsDirectionsUrl(
            userLocation,
            attraction.address || attraction.name
          )}
          target="_blank"
          rel="noreferrer"
          className="flex h-10 items-center justify-center gap-2 rounded-full bg-primary text-sm font-bold text-primary-foreground"
        >
          <IconNavigation size={16} />
          Navigate with Google Maps
        </a>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onBack}
            disabled={!canGoBack}
            className="flex h-10 items-center justify-center gap-2 rounded-full border border-border text-sm font-bold transition-colors hover:border-primary/50 hover:text-primary disabled:pointer-events-none disabled:opacity-30"
          >
            <IconBack size={16} />
            Back
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!canGoNext}
            className="flex h-10 items-center justify-center gap-2 rounded-full border border-border text-sm font-bold transition-colors hover:border-primary/50 hover:text-primary disabled:pointer-events-none disabled:opacity-30"
          >
            Next
            <IconChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
