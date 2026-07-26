import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  resolveAddressText,
  resolveBusinessPlace,
  resolveGeocodedPlace,
} from "@/lib/arcgis";
import { resolveGooglePlace } from "@/lib/google-places";

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
    return NextResponse.json(null, { status: 401 });
  }

  const source = request.nextUrl.searchParams.get("source");
  const text = request.nextUrl.searchParams.get("text");
  const magicKey = request.nextUrl.searchParams.get("magicKey");
  const placeId = request.nextUrl.searchParams.get("placeId");
  const bias = readBias(request);

  if (source === "google" && placeId) {
    const place = await resolveGooglePlace(placeId);
    if (place) return NextResponse.json(place);

    // Google resolve failed (transient error, or the place fell out of
    // billing/quota) — fall back to an ArcGIS text geocode of the same
    // suggestion instead of failing the whole selection.
    if (text) {
      const fallback = await resolveAddressText(text, bias);
      return NextResponse.json(fallback);
    }
    return NextResponse.json(null);
  }

  if (placeId) {
    const place = await resolveBusinessPlace(placeId);
    return NextResponse.json(place);
  }

  if (!text || !magicKey) {
    return NextResponse.json(null, { status: 400 });
  }

  const place = await resolveGeocodedPlace(text, magicKey, bias);
  return NextResponse.json(place);
}
