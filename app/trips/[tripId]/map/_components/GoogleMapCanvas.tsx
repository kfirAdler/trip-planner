"use client";

import { useEffect, useRef } from "react";
import { CATEGORY_META } from "@/lib/categories";
import type { UserLocation } from "./TripMap";
import type { Category } from "@/app/generated/prisma/client";

type MappableAttraction = {
  id: string;
  category: Category;
  dayIndex: number | null;
  routeOrder: number;
  lat: number;
  lng: number;
};

const DEFAULT_CENTER = { lat: 35.6812, lng: 139.7671 };

// Classic Google "night mode" JSON styles — applied to the roadmap layer
// when the app is in dark mode (satellite imagery ignores styles, same as
// stock Google Maps behavior).
const DARK_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#212121" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#212121" }] },
  {
    featureType: "administrative",
    elementType: "geometry",
    stylers: [{ color: "#757575" }],
  },
  {
    featureType: "administrative.country",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9e9e9e" }],
  },
  {
    featureType: "administrative.land_parcel",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#bdbdbd" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#757575" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#181818" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#616161" }],
  },
  {
    featureType: "road",
    elementType: "geometry.fill",
    stylers: [{ color: "#2c2c2c" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#8a8a8a" }],
  },
  {
    featureType: "road.arterial",
    elementType: "geometry",
    stylers: [{ color: "#373737" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#3c3c3c" }],
  },
  {
    featureType: "road.highway.controlled_access",
    elementType: "geometry",
    stylers: [{ color: "#4e4e4e" }],
  },
  { featureType: "road.local", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  {
    featureType: "transit",
    elementType: "labels.text.fill",
    stylers: [{ color: "#757575" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#000000" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#3d3d3d" }],
  },
];

function currentIsDark() {
  return document.documentElement.dataset.theme
    ? document.documentElement.dataset.theme === "dark"
    : window.matchMedia("(prefers-color-scheme: dark)").matches;
}

// One shared loader promise so switching the map toggle back and forth (or
// mounting the beta map on multiple pages) doesn't inject the script twice.
let googleMapsLoader: Promise<typeof google> | null = null;

function loadGoogleMaps(apiKey: string): Promise<typeof google> {
  if (window.google?.maps) return Promise.resolve(window.google);
  if (googleMapsLoader) return googleMapsLoader;

  googleMapsLoader = new Promise((resolve, reject) => {
    const existing = document.getElementById(
      "google-maps-script"
    ) as HTMLScriptElement | null;
    const onLoad = () => {
      if (window.google?.maps) resolve(window.google);
      else reject(new Error("Google Maps failed to initialize"));
    };
    if (existing) {
      existing.addEventListener("load", onLoad);
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load Google Maps"))
      );
      return;
    }

    const script = document.createElement("script");
    script.id = "google-maps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey
    )}&loading=async&v=weekly`;
    script.async = true;
    script.addEventListener("load", onLoad);
    script.addEventListener("error", () =>
      reject(new Error("Failed to load Google Maps"))
    );
    document.head.appendChild(script);
  });

  return googleMapsLoader;
}

export function GoogleMapCanvas({
  attractions,
  apiKey,
  initialCenter,
  userLocation,
  locateRequest,
  selectedId,
  onSelect,
}: {
  attractions: MappableAttraction[];
  apiKey: string;
  initialCenter?: { lat: number; lng: number };
  userLocation: UserLocation | null;
  locateRequest: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const onSelectRef = useRef(onSelect);
  const themeCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    let cancelled = false;

    loadGoogleMaps(apiKey)
      .then((maps) => {
        if (cancelled || !containerRef.current) return;

        const first = attractions[0];
        const startingPoint = first ?? initialCenter ?? DEFAULT_CENTER;
        const isDark = currentIsDark();

        const map = new maps.maps.Map(containerRef.current, {
          center: { lat: startingPoint.lat, lng: startingPoint.lng },
          zoom: 12,
          disableDefaultUI: true,
          zoomControl: true,
          mapTypeControl: true,
          mapTypeControlOptions: {
            style: maps.maps.MapTypeControlStyle.HORIZONTAL_BAR,
            position: maps.maps.ControlPosition.TOP_RIGHT,
          },
          styles: isDark ? DARK_MAP_STYLES : [],
        });
        mapRef.current = map;

        const handleThemeChange = (event: Event) => {
          const theme = (event as CustomEvent<{ theme: "light" | "dark" }>)
            .detail.theme;
          map.setOptions({ styles: theme === "dark" ? DARK_MAP_STYLES : [] });
        };
        const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
        const handleSystemThemeChange = (event: MediaQueryListEvent) => {
          if (document.documentElement.dataset.theme) return;
          map.setOptions({ styles: event.matches ? DARK_MAP_STYLES : [] });
        };
        window.addEventListener("app-theme-change", handleThemeChange);
        systemTheme.addEventListener("change", handleSystemThemeChange);
        themeCleanupRef.current = () => {
          window.removeEventListener("app-theme-change", handleThemeChange);
          systemTheme.removeEventListener("change", handleSystemThemeChange);
        };

        const bounds = new maps.maps.LatLngBounds();
        const markers = new Map<string, google.maps.Marker>();

        attractions.forEach((attraction) => {
          const meta = CATEGORY_META[attraction.category];
          const position = { lat: attraction.lat, lng: attraction.lng };
          bounds.extend(position);

          const marker = new maps.maps.Marker({
            position,
            map,
            label: {
              text: String(attraction.routeOrder),
              color: "#ffffff",
              fontSize: "11px",
              fontWeight: "bold",
            },
            icon: {
              path: maps.maps.SymbolPath.CIRCLE,
              scale: 12,
              fillColor: meta.hex,
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 2,
            },
          });
          marker.addListener("click", () => onSelectRef.current(attraction.id));
          markers.set(attraction.id, marker);
        });

        markersRef.current = markers;

        if (attractions.length > 1) {
          map.fitBounds(bounds, 60);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current.clear();
      userMarkerRef.current?.setMap(null);
      userMarkerRef.current = null;
      mapRef.current = null;
      themeCleanupRef.current?.();
      themeCleanupRef.current = null;
    };
  }, [apiKey, attractions, initialCenter]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userLocation || !window.google) return;

    if (!userMarkerRef.current) {
      userMarkerRef.current = new window.google.maps.Marker({
        position: { lat: userLocation.lat, lng: userLocation.lng },
        map,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 7,
          fillColor: "#2f80ed",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 3,
        },
        zIndex: 999,
      });
    } else {
      userMarkerRef.current.setPosition({
        lat: userLocation.lat,
        lng: userLocation.lng,
      });
    }
  }, [userLocation]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userLocation || locateRequest === 0) return;
    map.panTo({ lat: userLocation.lat, lng: userLocation.lng });
    map.setZoom(Math.max(map.getZoom() ?? 12, 16));
  }, [locateRequest, userLocation]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const selected = attractions.find((a) => a.id === selectedId);
    if (!selected) return;
    map.panTo({ lat: selected.lat, lng: selected.lng });
    map.setZoom(Math.max(map.getZoom() ?? 12, 14));
  }, [selectedId, attractions]);

  return <div ref={containerRef} className="absolute inset-0" />;
}
