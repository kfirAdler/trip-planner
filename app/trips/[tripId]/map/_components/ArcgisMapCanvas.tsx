"use client";

import { useEffect, useRef } from "react";
import esriConfig from "@arcgis/core/config.js";
import EsriMap from "@arcgis/core/Map.js";
import Basemap from "@arcgis/core/Basemap.js";
import MapView from "@arcgis/core/views/MapView.js";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer.js";
import Graphic from "@arcgis/core/Graphic.js";
import Point from "@arcgis/core/geometry/Point.js";
import SimpleMarkerSymbol from "@arcgis/core/symbols/SimpleMarkerSymbol.js";
import "@arcgis/core/assets/esri/themes/light/main.css";
import { CATEGORY_META } from "@/lib/categories";
import type { Category } from "@/app/generated/prisma/client";

type MappableAttraction = {
  id: string;
  category: Category;
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

export function ArcgisMapCanvas({
  attractions,
  apiKey,
  onSelect,
}: {
  attractions: MappableAttraction[];
  apiKey: string;
  onSelect: (id: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Keep the latest callback/data available to the click handler without
  // re-running the whole setup effect (which would tear down/rebuild the map).
  const onSelectRef = useRef(onSelect);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    if (!containerRef.current || attractions.length === 0) return;

    esriConfig.apiKey = apiKey;

    const isDark = document.documentElement.dataset.theme
      ? document.documentElement.dataset.theme === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;

    const layer = new GraphicsLayer({
      graphics: attractions.map((attraction) => {
        const meta = CATEGORY_META[attraction.category];
        const isTerminus = attraction.category === "LODGING";
        return new Graphic({
          geometry: new Point({ longitude: attraction.lng, latitude: attraction.lat }),
          symbol: new SimpleMarkerSymbol({
            color: meta.hex,
            size: isTerminus ? 18 : 14,
            outline: { color: "#ffffff", width: 1.5 },
          }),
          attributes: { id: attraction.id },
        });
      }),
    });

    const map = new EsriMap({
      basemap: navigationBasemap(isDark),
      layers: [layer],
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
    view.padding = { top: 0, right: 0, bottom: 80, left: 0 };

    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
    const handleThemeChange = (event: Event) => {
      const theme = (event as CustomEvent<{ theme: "light" | "dark" }>).detail
        .theme;
      map.basemap = navigationBasemap(theme === "dark");
    };
    const handleSystemThemeChange = (event: MediaQueryListEvent) => {
      if (!document.documentElement.dataset.theme) {
        map.basemap = navigationBasemap(event.matches);
      }
    };

    window.addEventListener("app-theme-change", handleThemeChange);
    systemTheme.addEventListener("change", handleSystemThemeChange);

    const clickHandle = view.on("click", async (event) => {
      const { results } = await view.hitTest(event, { include: layer });
      const hit = results.find(
        (r): r is typeof r & { type: "graphic" } => r.type === "graphic"
      );
      const id = hit?.graphic.attributes?.id ?? null;
      onSelectRef.current(id);
    });

    view
      .when(() => {
        if (attractions.length > 1) {
          return view.goTo(layer.graphics.toArray(), { animate: false });
        }
      })
      .catch(() => {});

    return () => {
      window.removeEventListener("app-theme-change", handleThemeChange);
      systemTheme.removeEventListener("change", handleSystemThemeChange);
      clickHandle.remove();
      view.destroy();
    };
  }, [apiKey, attractions]);

  return <div ref={containerRef} className="absolute inset-0" />;
}
