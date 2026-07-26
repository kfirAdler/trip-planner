import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { suggestPlaces } from "@/lib/arcgis";
import { suggestGooglePlaces } from "@/lib/google-places";

function readBias(request: NextRequest) {
  const latValue = request.nextUrl.searchParams.get("lat");
  const lngValue = request.nextUrl.searchParams.get("lng");
  if (latValue === null || lngValue === null) return undefined;

  const lat = Number(latValue);
  const lng = Number(lngValue);
  return Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
    ? { lat, lng }
    : undefined;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ suggestions: [] }, { status: 401 });
  }

  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  const field =
    request.nextUrl.searchParams.get("field") === "address"
      ? "address"
      : "name";
  const bias = readBias(request);

  // Google Places is the primary source; ArcGIS (already free, no billing
  // account required) is the fallback when Google is unset or returns
  // nothing — e.g. a query it doesn't recognize, or a transient failure.
  const googleSuggestions = await suggestGooglePlaces(query, bias, field);
  const suggestions =
    googleSuggestions.length > 0
      ? googleSuggestions
      : await suggestPlaces(query, bias, field);
  return NextResponse.json({ suggestions });
}
