const SUGGEST_URL =
  "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/suggest";
const CANDIDATES_URL =
  "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates";
const PLACES_URL =
  "https://places-api.arcgis.com/arcgis/rest/services/places-service/v1";

// This trip is Japan-only — bias suggestions toward Japan's rough center and
// restrict results to Japan so e.g. "Ichiran" doesn't surface branches abroad.
const JAPAN_BIAS_LOCATION = "138.25,36.2";
const TOKYO_PLACE_BIAS = { lat: 35.6812, lng: 139.7671 };

export type PlaceSuggestion =
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
    };
export type PlaceSearchBias = { lat: number; lng: number };
export type ResolvedPlace = {
  name: string;
  address: string;
  lat: number;
  lng: number;
};

async function suggestAddresses(
  query: string,
  bias?: PlaceSearchBias
): Promise<PlaceSuggestion[]> {
  const token = process.env.ARCGIS_API_KEY;
  if (!token) return [];

  const url = new URL(SUGGEST_URL);
  url.searchParams.set("f", "json");
  url.searchParams.set("token", token);
  url.searchParams.set("text", query);
  url.searchParams.set(
    "location",
    bias ? `${bias.lng},${bias.lat}` : JAPAN_BIAS_LOCATION
  );
  url.searchParams.set("countryCode", "JPN");
  url.searchParams.set("category", "Address");
  url.searchParams.set("maxSuggestions", "8");

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return [];

  const data = await res.json();
  if (!Array.isArray(data.suggestions)) return [];

  return data.suggestions
    .filter((s: { isCollection?: boolean }) => !s.isCollection)
    .map((s: { text: string; magicKey: string }) => ({
      id: `geocode:${s.magicKey}`,
      source: "geocode" as const,
      text: s.text,
      subtitle: "Address",
      magicKey: s.magicKey,
    }));
}

async function requestBusinessPlaces(
  query: string,
  bias?: PlaceSearchBias
): Promise<PlaceSuggestion[]> {
  const token = process.env.ARCGIS_API_KEY;
  if (!token || query.trim().length < 3) return [];

  const location = bias ?? TOKYO_PLACE_BIAS;
  const url = new URL(`${PLACES_URL}/places/near-point`);
  url.searchParams.set("f", "json");
  url.searchParams.set("token", token);
  url.searchParams.set("x", String(location.lng));
  url.searchParams.set("y", String(location.lat));
  url.searchParams.set("radius", "10000");
  url.searchParams.set("pageSize", "8");
  url.searchParams.set("searchText", query);

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) return [];

  const data = await response.json();
  if (!Array.isArray(data.results)) return [];

  return data.results.map(
    (result: {
      placeId: string;
      name: string;
      distance?: number;
      categories?: Array<{ label?: string }>;
    }) => {
      const category = result.categories?.[0]?.label ?? "Business";
      const distance =
        typeof result.distance === "number"
          ? result.distance < 1000
            ? `${Math.round(result.distance)} m away`
            : `${(result.distance / 1000).toFixed(1)} km away`
          : null;

      return {
        id: `places:${result.placeId}`,
        source: "places" as const,
        text: result.name,
        subtitle: [category, distance].filter(Boolean).join(" · "),
        placeId: result.placeId,
      };
    }
  );
}

async function suggestBusinesses(
  query: string,
  bias?: PlaceSearchBias
): Promise<PlaceSuggestion[]> {
  const exact = await requestBusinessPlaces(query, bias);
  if (exact.length > 0) return exact;

  const firstWord = query.trim().split(/\s+/)[0];
  if (firstWord.length < 3 || firstWord.toLowerCase() === query.toLowerCase()) {
    return [];
  }
  return requestBusinessPlaces(firstWord, bias);
}

export async function suggestPlaces(
  query: string,
  bias?: PlaceSearchBias,
  field: "name" | "address" = "name"
): Promise<PlaceSuggestion[]> {
  const suggestions =
    field === "address"
      ? await suggestAddresses(query, bias)
      : await suggestBusinesses(query, bias);
  const seen = new Set<string>();

  return suggestions
    .filter((suggestion) => {
      const key = suggestion.text.trim().toLocaleLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 10);
}

export async function resolveGeocodedPlace(
  text: string,
  magicKey: string,
  bias?: PlaceSearchBias
): Promise<ResolvedPlace | null> {
  const token = process.env.ARCGIS_API_KEY;
  if (!token) return null;

  const url = new URL(CANDIDATES_URL);
  url.searchParams.set("f", "json");
  url.searchParams.set("token", token);
  url.searchParams.set("singleLine", text);
  url.searchParams.set("magicKey", magicKey);
  url.searchParams.set("countryCode", "JPN");
  url.searchParams.set("category", "Address");
  url.searchParams.set(
    "location",
    bias ? `${bias.lng},${bias.lat}` : JAPAN_BIAS_LOCATION
  );
  url.searchParams.set("outFields", "PlaceName,ShortLabel,Match_addr");

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;

  const data = await res.json();
  const best = data.candidates?.[0];
  if (!best?.location) return null;

  return {
    name:
      (best.attributes?.PlaceName as string | undefined) ||
      (best.attributes?.ShortLabel as string | undefined) ||
      String(best.address).split(",")[0],
    address:
      (best.attributes?.Match_addr as string | undefined) ||
      (best.address as string),
    lat: best.location.y as number,
    lng: best.location.x as number,
  };
}

export async function resolveBusinessPlace(
  placeId: string
): Promise<ResolvedPlace | null> {
  const token = process.env.ARCGIS_API_KEY;
  if (!token) return null;

  const url = new URL(`${PLACES_URL}/places/${encodeURIComponent(placeId)}`);
  url.searchParams.set("f", "json");
  url.searchParams.set("token", token);
  url.searchParams.set(
    "requestedFields",
    [
      "name",
      "location",
      "address:streetAddress",
      "address:locality",
      "address:region",
      "address:postcode",
      "address:country",
    ].join(",")
  );

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) return null;

  const data = await response.json();
  const place = data.placeDetails;
  if (!place?.name || !place?.location) return null;

  const address = [
    place.address?.streetAddress,
    place.address?.locality,
    place.address?.region,
    place.address?.postcode,
    place.address?.country === "JP" ? "Japan" : place.address?.country,
  ]
    .filter(Boolean)
    .join(", ");

  return {
    name: place.name as string,
    address,
    lat: place.location.y as number,
    lng: place.location.x as number,
  };
}
