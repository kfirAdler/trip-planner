import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { resolvePlace } from "@/lib/arcgis";

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

  const place = await resolvePlace(text, magicKey);
  return NextResponse.json(place);
}
