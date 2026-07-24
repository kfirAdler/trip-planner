import { requireTripAccess } from "@/lib/trip-access";
import { TripTabBar } from "./_components/TripTabBar";

export default async function TripLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  await requireTripAccess(tripId, "VIEWER");

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col pb-16">{children}</div>
      <TripTabBar tripId={tripId} />
    </div>
  );
}
