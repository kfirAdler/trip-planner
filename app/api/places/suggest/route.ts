import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { suggestPlaces } from "@/lib/arcgis";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ suggestions: [] }, { status: 401 });
  }

  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  const suggestions = await suggestPlaces(query);
  return NextResponse.json({ suggestions });
}
