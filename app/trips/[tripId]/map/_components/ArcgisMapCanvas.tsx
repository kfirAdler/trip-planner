"use client";

import { useEffect, useRef } from "react";
import esriConfig from "@arcgis/core/config.js";
import EsriMap from "@arcgis/core/Map.js";
import Basemap from "@arcgis/core/Basemap.js";
import MapView from "@arcgis/core/views/MapView.js";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer.js";
import Graphic from "@arcgis/core/Graphic.js";
import Point from "@arcgis/core/geometry/Point.js";
import Polyline from "@arcgis/core/geometry/Polyline.js";
import SimpleMarkerSymbol from "@arcgis/core/symbols/SimpleMarkerSymbol.js";
import SimpleLineSymbol from "@arcgis/core/symbols/SimpleLineSymbol.js";
import TextSymbol from "@arcgis/core/symbols/TextSymbol.js";
import "@arcgis/core/assets/esri/themes/light/main.css";
import { CATEGORY_META } from "@/lib/categories";
import type { Category } from "@/app/generated/prisma/client";

type MappableAttraction = {
  id: string;
  category: Category;
  dayIndex: number | null;
  routeOrder: number;
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

export function ArcgisMapCanvas({
  attractions,
  apiKey,
  selectedId,
  onSelect,
}: {
  attractions: MappableAttraction[];
  apiKey: string;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<MapView | null>(null);
  // Keep the latest callback/data available to the click handler without
  // re-running the whole setup effect (which would tear down/rebuild the map).
  const onSelectRef = useRef(onSelect);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    const view = viewRef.current;
    const selected = attractions.find((attraction) => attraction.id === selectedId);
    if (!view) return;

    view.padding = {
      top: 0,
      right: 0,
      bottom: selected ? 260 : 80,
      left: 0,
    };

    if (!selected) return;

    view
      .goTo(
        {
          center: [selected.lng, selected.lat],
          zoom: Math.max(view.zoom, 14),
        },
        { animate: true, duration: 450 }
      )
      .catch(() => {});
  }, [attractions, selectedId]);

  useEffect(() => {
    if (!containerRef.current || attractions.length === 0) return;

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
          attributes: { id: attraction.id },
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
          attributes: { id: attraction.id },
        })
    );
    const markerLayer = new GraphicsLayer({
      graphics: [...pointGraphics, ...numberGraphics],
    });

    const map = new EsriMap({
      basemap: navigationBasemap(isDark),
      layers: [routeLayer, markerLayer],
    });

    const first = attractions[0];
    const view = new MapView({
      container: containerRef.current,
      map,
      center: [first.lng, first.lat],
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
      const { results } = await view.hitTest(event, { include: markerLayer });
      const hit = results.find(
        (r): r is typeof r & { type: "graphic" } => r.type === "graphic"
      );
      const id = hit?.graphic.attributes?.id ?? null;
      onSelectRef.current(id);
    });

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
      viewRef.current = null;
      view.destroy();
    };
  }, [apiKey, attractions]);

  return <div ref={containerRef} className="absolute inset-0" />;
}
