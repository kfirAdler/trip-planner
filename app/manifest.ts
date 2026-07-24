import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Japan Trip",
    short_name: "Japan Trip",
    description: "Personal itinerary planner for the Japan trip",
    start_url: "/trips",
    display: "standalone",
    background_color: "#fbf7f0",
    theme_color: "#1e3a5f",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
