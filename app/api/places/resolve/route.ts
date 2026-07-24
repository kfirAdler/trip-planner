import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { resolvePlace } from "@/lib/arcgis";

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

  const text = request.nextUrl.searchParams.get("text");
  const magicKey = request.nextUrl.searchParams.get("magicKey");
  if (!text || !magicKey) {
    return NextResponse.json(null, { status: 400 });
  }

  const place = await resolvePlace(text, magicKey, readBias(request));
  return NextResponse.json(place);
}
