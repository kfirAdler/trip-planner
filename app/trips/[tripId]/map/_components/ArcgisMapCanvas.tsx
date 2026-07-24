"use client";

import { useEffect, useRef } from "react";
import esriConfig from "@arcgis/core/config.js";
import * as reactiveUtils from "@arcgis/core/core/reactiveUtils.js";
import EsriMap from "@arcgis/core/Map.js";
import Basemap from "@arcgis/core/Basemap.js";
import MapView from "@arcgis/core/views/MapView.js";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer.js";
import Graphic from "@arcgis/core/Graphic.js";
import Point from "@arcgis/core/geometry/Point.js";
import Polyline from "@arcgis/core/geometry/Polyline.js";
import SimpleMarkerSymbol from "@arcgis/core/symbols/SimpleMarkerSymbol.js";
import SimpleLineSymbol from "@arcgis/core/symbols/SimpleLineSymbol.js";
import CIMSymbol from "@arcgis/core/symbols/CIMSymbol.js";
import PictureMarkerSymbol from "@arcgis/core/symbols/PictureMarkerSymbol.js";
import TextSymbol from "@arcgis/core/symbols/TextSymbol.js";
import { queryPlacesWithinExtent } from "@arcgis/core/rest/places.js";
import PlacesQueryParameters from "@arcgis/core/rest/support/PlacesQueryParameters.js";
import type PlaceResult from "@arcgis/core/rest/support/PlaceResult.js";
import type { CIMSymbolReference } from "@arcgis/core/symbols/cim/types.js";
import "@arcgis/core/assets/esri/themes/light/main.css";
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

export type NearbyPlace = {
  placeId: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
};

function navigationBasemap(isDark: boolean) {
  return new Basemap({
    style: {
      id: isDark ? "arcgis/navigation-night" : "arcgis/navigation",
      language: "en",
      places: "all",
    },
  });
}

function routeLineSymbol(isDark: boolean) {
  return new SimpleLineSymbol({
    color: isDark ? [140, 174, 212, 0.9] : [23, 38, 61, 0.75],
    width: 3,
    cap: "round",
    join: "round",
  });
}

function drawUserLocation(
  layer: GraphicsLayer,
  location: UserLocation | null
) {
  layer.removeAll();
  if (!location) return;

  const point = new Point({
    longitude: location.lng,
    latitude: location.lat,
  });
  layer.addMany([
    new Graphic({
      geometry: point,
      symbol: new SimpleMarkerSymbol({
        color: [47, 128, 237, 0.22],
        size: 30,
        outline: { color: [47, 128, 237, 0.35], width: 1 },
      }),
    }),
    new Graphic({
      geometry: point,
      symbol: new SimpleMarkerSymbol({
        color: [47, 128, 237, 1],
        size: 12,
        outline: { color: "#ffffff", width: 3 },
      }),
    }),
  ]);
}

export function ArcgisMapCanvas({
  attractions,
  apiKey,
  initialCenter,
  userLocation,
  locateRequest,
  selectedId,
  selectedNearby,
  onSelect,
  onNearbySelect,
}: {
  attractions: MappableAttraction[];
  apiKey: string;
  initialCenter?: { lat: number; lng: number };
  userLocation: UserLocation | null;
  locateRequest: number;
  selectedId: string | null;
  selectedNearby: NearbyPlace | null;
  onSelect: (id: string | null) => void;
  onNearbySelect: (place: NearbyPlace | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<MapView | null>(null);
  const userLocationLayerRef = useRef<GraphicsLayer | null>(null);
  const userLocationRef = useRef(userLocation);
  // Keep the latest callback/data available to the click handler without
  // re-running the whole setup effect (which would tear down/rebuild the map).
  const onSelectRef = useRef(onSelect);
  const onNearbySelectRef = useRef(onNearbySelect);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    onNearbySelectRef.current = onNearbySelect;
  }, [onNearbySelect]);

  useEffect(() => {
    userLocationRef.current = userLocation;
    const layer = userLocationLayerRef.current;
    if (layer) drawUserLocation(layer, userLocation);
  }, [userLocation]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || !userLocation || locateRequest === 0) return;

    view
      .goTo(
        {
          center: [userLocation.lng, userLocation.lat],
          zoom: Math.max(view.zoom, 16),
        },
        { animate: true, duration: 450 }
      )
      .catch(() => {});
  }, [locateRequest, userLocation]);

  useEffect(() => {
    const view = viewRef.current;
    const selected = attractions.find((attraction) => attraction.id === selectedId);
    const target = selected ?? selectedNearby;
    if (!view) return;

    view.padding = {
      top: 0,
      right: 0,
      bottom: target ? 260 : 80,
      left: 0,
    };

    if (!target) return;

    view
      .goTo(
        {
          center: [target.lng, target.lat],
          zoom: Math.max(view.zoom, 14),
        },
        { animate: true, duration: 450 }
      )
      .catch(() => {});
  }, [attractions, selectedId, selectedNearby]);

  useEffect(() => {
    if (!containerRef.current) return;

    esriConfig.apiKey = apiKey;

    const isDark = document.documentElement.dataset.theme
      ? document.documentElement.dataset.theme === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;

    const byDay = new Map<number, MappableAttraction[]>();
    for (const attraction of attractions) {
      if (attraction.dayIndex === null) continue;
      const dayRoute = byDay.get(attraction.dayIndex) ?? [];
      dayRoute.push(attraction);
      byDay.set(attraction.dayIndex, dayRoute);
    }

    const routeGraphics = Array.from(byDay.values())
      .filter((dayRoute) => dayRoute.length > 1)
      .map(
        (dayRoute) =>
          new Graphic({
            geometry: new Polyline({
              paths: [
                dayRoute.map((attraction) => [
                  attraction.lng,
                  attraction.lat,
                ]),
              ],
              spatialReference: { wkid: 4326 },
            }),
            symbol: routeLineSymbol(isDark),
          })
      );
    const routeLayer = new GraphicsLayer({ graphics: routeGraphics });

    const pointGraphics = attractions.map((attraction) => {
        const meta = CATEGORY_META[attraction.category];
        return new Graphic({
          geometry: new Point({ longitude: attraction.lng, latitude: attraction.lat }),
          symbol: new SimpleMarkerSymbol({
            color: meta.hex,
            size: 24,
            outline: { color: "#ffffff", width: 2 },
          }),
          attributes: { id: attraction.id, kind: "itinerary" },
        });
      });
    const numberGraphics = attractions.map(
      (attraction) =>
        new Graphic({
          geometry: new Point({
            longitude: attraction.lng,
            latitude: attraction.lat,
          }),
          symbol: new TextSymbol({
            text: String(attraction.routeOrder),
            color: "#ffffff",
            haloColor: "rgba(0, 0, 0, 0.35)",
            haloSize: 1,
            font: {
              family: "Arial",
              size: 9,
              weight: "bold",
            },
          }),
          attributes: { id: attraction.id, kind: "itinerary" },
        })
    );
    const markerLayer = new GraphicsLayer({
      graphics: [...pointGraphics, ...numberGraphics],
    });
    const nearbyLayer = new GraphicsLayer();
    const userLocationLayer = new GraphicsLayer();
    userLocationLayerRef.current = userLocationLayer;
    drawUserLocation(userLocationLayer, userLocationRef.current);

    const map = new EsriMap({
      basemap: navigationBasemap(isDark),
      layers: [routeLayer, nearbyLayer, markerLayer, userLocationLayer],
    });

    const first = attractions[0];
    const startingPoint = first ?? initialCenter ?? { lat: 35.6812, lng: 139.7671 };
    const view = new MapView({
      container: containerRef.current,
      map,
      center: [startingPoint.lng, startingPoint.lat],
      zoom: 12,
      popupEnabled: false,
      // Hides zoom/compass/nav-toggle widgets (pinch-to-zoom is native on
      // mobile); attribution isn't part of this list and always stays visible
      // as required by Esri's terms of use.
      ui: { components: [] },
    });
    viewRef.current = view;
    view.padding = { top: 0, right: 0, bottom: 80, left: 0 };

    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
    const handleThemeChange = (event: Event) => {
      const theme = (event as CustomEvent<{ theme: "light" | "dark" }>).detail
        .theme;
      const nextIsDark = theme === "dark";
      map.basemap = navigationBasemap(nextIsDark);
      routeLayer.graphics.forEach((graphic) => {
        graphic.symbol = routeLineSymbol(nextIsDark);
      });
    };
    const handleSystemThemeChange = (event: MediaQueryListEvent) => {
      if (!document.documentElement.dataset.theme) {
        map.basemap = navigationBasemap(event.matches);
        routeLayer.graphics.forEach((graphic) => {
          graphic.symbol = routeLineSymbol(event.matches);
        });
      }
    };

    window.addEventListener("app-theme-change", handleThemeChange);
    systemTheme.addEventListener("change", handleSystemThemeChange);

    const clickHandle = view.on("click", async (event) => {
      const { results } = await view.hitTest(event, {
        include: [markerLayer, nearbyLayer],
      });
      const itineraryHit = results.find(
        (r): r is typeof r & { type: "graphic" } =>
          r.type === "graphic" && r.graphic.attributes?.kind === "itinerary"
      );
      if (itineraryHit) {
        onNearbySelectRef.current(null);
        onSelectRef.current(itineraryHit.graphic.attributes.id);
        return;
      }

      const nearbyHit = results.find(
        (r): r is typeof r & { type: "graphic" } => r.type === "graphic"
      );
      if (nearbyHit?.graphic.attributes?.kind === "nearby") {
        const attributes = nearbyHit.graphic.attributes;
        onSelectRef.current(null);
        onNearbySelectRef.current({
          placeId: attributes.placeId,
          name: attributes.name,
          category: attributes.category,
          lat: attributes.lat,
          lng: attributes.lng,
        });
        return;
      }

      onSelectRef.current(null);
      onNearbySelectRef.current(null);
    });

    let placesRequest: AbortController | null = null;
    let lastPlacesExtentKey = "";
    const cimSymbolCache = new Map<string, Promise<CIMSymbol>>();

    const loadCimSymbol = (url: string, signal: AbortSignal) => {
      const cached = cimSymbolCache.get(url);
      if (cached) return cached.then((symbol) => symbol.clone());

      const pending = fetch(url, { signal })
        .then((response) => {
          if (!response.ok) throw new Error("Place symbol could not be loaded");
          return response.json() as Promise<CIMSymbolReference["symbol"]>;
        })
        .then(
          (symbol) =>
            new CIMSymbol({
              data: {
                type: "CIMSymbolReference",
                symbol,
              },
            })
        )
        .catch((error) => {
          cimSymbolCache.delete(url);
          throw error;
        });
      cimSymbolCache.set(url, pending);
      return pending.then((symbol) => symbol.clone());
    };

    const nearbyHandle = reactiveUtils.watch(
      () => view.stationary,
      async (stationary) => {
        if (!stationary || !view.extent) return;

        const visibleExtent = view.extent.clone();
        const extentKey = [
          visibleExtent.xmin,
          visibleExtent.ymin,
          visibleExtent.xmax,
          visibleExtent.ymax,
        ]
          .map((coordinate) => Math.round(coordinate / 100))
          .join(":");
        if (extentKey === lastPlacesExtentKey) return;
        lastPlacesExtentKey = extentKey;

        placesRequest?.abort();
        const request = new AbortController();
        placesRequest = request;

        // ArcGIS limits a within-extent Places query to 20 km in either
        // direction. The navigation basemap still supplies its own place
        // labels at wider scales; interactive results resume after zooming in.
        if (visibleExtent.width >= 19500 || visibleExtent.height >= 19500) {
          nearbyLayer.removeAll();
          return;
        }

        try {
          const places: PlaceResult[] = [];
          let query: PlacesQueryParameters | null = new PlacesQueryParameters({
            apiKey,
            extent: visibleExtent,
            pageSize: 20,
            icon: "cim",
          });

          while (query && places.length < 200) {
            const result = await queryPlacesWithinExtent(query, {
              signal: request.signal,
            });
            if (request !== placesRequest) return;
            places.push(...result.results);
            query = result.nextQueryParams ?? null;
          }

          const uniquePlaces = Array.from(
            new Map(places.map((place) => [place.placeId, place])).values()
          );
          const graphics = await Promise.all(
            uniquePlaces.map(async (place) => {
              const category = place.categories[0]?.label ?? "Place";
              const attributes = {
                kind: "nearby",
                placeId: place.placeId,
                name: place.name,
                category,
                lat: place.location.latitude,
                lng: place.location.longitude,
              };
              const point = new Point({
                longitude: place.location.longitude,
                latitude: place.location.latitude,
              });
              const fallbackSymbol = () =>
                new PictureMarkerSymbol({
                  url: "https://static.arcgis.com/icons/places/Default_Shop_or_Service_15.svg",
                  width: 18,
                  height: 18,
                });
              const symbol = place.icon?.url
                ? await loadCimSymbol(place.icon.url, request.signal).catch(
                    (error) => {
                      if ((error as Error).name === "AbortError") throw error;
                      return fallbackSymbol();
                    }
                  )
                : fallbackSymbol();

              return new Graphic({
                geometry: point,
                symbol,
                attributes,
              });
            })
          );
          if (request !== placesRequest) return;

          nearbyLayer.removeAll();
          nearbyLayer.addMany(graphics);
        } catch (error) {
          if (request !== placesRequest) return;
          lastPlacesExtentKey = "";
          if ((error as Error).name === "AbortError") return;
        }
      },
      { initial: true }
    );

    view
      .when(() => {
        if (attractions.length > 1) {
          return view.goTo(pointGraphics, { animate: false });
        }
      })
      .catch(() => {});

    return () => {
      window.removeEventListener("app-theme-change", handleThemeChange);
      systemTheme.removeEventListener("change", handleSystemThemeChange);
      clickHandle.remove();
      nearbyHandle.remove();
      placesRequest?.abort();
      userLocationLayerRef.current = null;
      viewRef.current = null;
      view.destroy();
    };
  }, [apiKey, attractions, initialCenter]);

  return <div ref={containerRef} className="absolute inset-0" />;
}
