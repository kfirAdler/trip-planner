const SUGGEST_URL =
  "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/suggest";
const CANDIDATES_URL =
  "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates";

// This trip is Japan-only — bias suggestions toward Japan's rough center and
// restrict results to Japan so e.g. "Ichiran" doesn't surface branches abroad.
const JAPAN_BIAS_LOCATION = "138.25,36.2";

export type PlaceSuggestion = { text: string; magicKey: string };
export type ResolvedPlace = { label: string; lat: number; lng: number };

export async function suggestPlaces(query: string): Promise<PlaceSuggestion[]> {
  const token = process.env.ARCGIS_API_KEY;
  if (!token) return [];

  const url = new URL(SUGGEST_URL);
  url.searchParams.set("f", "json");
  url.searchParams.set("token", token);
  url.searchParams.set("text", query);
  url.searchParams.set("location", JAPAN_BIAS_LOCATION);
  url.searchParams.set("countryCode", "JPN");
  url.searchParams.set("maxSuggestions", "8");

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return [];

  const data = await res.json();
  if (!Array.isArray(data.suggestions)) return [];

  return data.suggestions
    .filter((s: { isCollection?: boolean }) => !s.isCollection)
    .map((s: { text: string; magicKey: string }) => ({
      text: s.text,
      magicKey: s.magicKey,
    }));
}

export async function resolvePlace(
  text: string,
  magicKey: string
): Promise<ResolvedPlace | null> {
  const token = process.env.ARCGIS_API_KEY;
  if (!token) return null;

  const url = new URL(CANDIDATES_URL);
  url.searchParams.set("f", "json");
  url.searchParams.set("token", token);
  url.searchParams.set("singleLine", text);
  url.searchParams.set("magicKey", magicKey);
  url.searchParams.set("outFields", "*");

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;

  const data = await res.json();
  const best = data.candidates?.[0];
  if (!best?.location) return null;

  return {
    label: best.address as string,
    lat: best.location.y as number,
    lng: best.location.x as number,
  };
}
