import type { PlaceSearchBias, ResolvedPlace } from "./arcgis";

const AUTOCOMPLETE_URL = "https://places.googleapis.com/v1/places:autocomplete";
const PLACE_DETAILS_URL = "https://places.googleapis.com/v1/places";

// Same Japan bias ArcGIS uses — this trip is Japan-only.
const TOKYO_BIAS = { lat: 35.6812, lng: 139.7671 };
const BIAS_RADIUS_METERS = 50000;

// Google is tried before the ArcGIS fallback on every call — a slow or
// hanging request here (unlike a clean error) would stall the whole
// suggest/resolve response instead of falling back promptly, so every
// Google fetch is bounded to this timeout regardless of outcome.
const REQUEST_TIMEOUT_MS = 4000;

function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  return fetch(url, { ...init, signal: controller.signal }).finally(() =>
    clearTimeout(timeout)
  );
}

export type GooglePlaceSuggestion = {
  id: string;
  source: "google";
  text: string;
  subtitle: string;
  placeId: string;
};

export async function suggestGooglePlaces(
  query: string,
  bias?: PlaceSearchBias,
  field: "name" | "address" = "name"
): Promise<GooglePlaceSuggestion[]> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey || query.trim().length < 2) return [];

  const center = bias ?? TOKYO_BIAS;
  const body: Record<string, unknown> = {
    input: query,
    languageCode: "en",
    includedRegionCodes: ["jp"],
    locationBias: {
      circle: {
        center: { latitude: center.lat, longitude: center.lng },
        radius: BIAS_RADIUS_METERS,
      },
    },
  };
  if (field === "address") {
    body.includedPrimaryTypes = ["street_address", "route", "premise"];
  }

  try {
    const response = await fetchWithTimeout(AUTOCOMPLETE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!response.ok) {
      console.error(
        "Google Places autocomplete failed",
        response.status,
        await response.text().catch(() => "")
      );
      return [];
    }

    const data = await response.json();
    const suggestions = data.suggestions;
    if (!Array.isArray(suggestions)) return [];

    return suggestions
      .map((entry: { placePrediction?: Record<string, unknown> }) => {
        const prediction = entry.placePrediction;
        if (!prediction) return null;

        const placeId = prediction.placeId as string | undefined;
        const structuredFormat = prediction.structuredFormat as
          | {
              mainText?: { text?: string };
              secondaryText?: { text?: string };
            }
          | undefined;
        const fullText = (prediction.text as { text?: string } | undefined)
          ?.text;
        const mainText = structuredFormat?.mainText?.text ?? fullText;
        if (!placeId || !mainText) return null;

        return {
          id: `google:${placeId}`,
          source: "google" as const,
          text: mainText,
          subtitle: structuredFormat?.secondaryText?.text ?? "Google",
          placeId,
        };
      })
      .filter((s: GooglePlaceSuggestion | null): s is GooglePlaceSuggestion => s !== null);
  } catch (error) {
    console.error(
      (error as Error).name === "AbortError"
        ? "Google Places autocomplete timed out"
        : "Google Places autocomplete threw",
      error
    );
    return [];
  }
}

export async function resolveGooglePlace(
  placeId: string
): Promise<ResolvedPlace | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetchWithTimeout(
      `${PLACE_DETAILS_URL}/${encodeURIComponent(placeId)}`,
      {
        headers: {
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "displayName,formattedAddress,location",
        },
        cache: "no-store",
      }
    );
    if (!response.ok) {
      console.error(
        "Google Place details failed",
        response.status,
        await response.text().catch(() => "")
      );
      return null;
    }

    const data = await response.json();
    const name = data.displayName?.text;
    const location = data.location;
    if (!name || typeof location?.latitude !== "number") return null;

    return {
      name,
      address: data.formattedAddress ?? "",
      lat: location.latitude,
      lng: location.longitude,
    };
  } catch (error) {
    console.error(
      (error as Error).name === "AbortError"
        ? "Google Place details timed out"
        : "Google Place details threw",
      error
    );
    return null;
  }
}
