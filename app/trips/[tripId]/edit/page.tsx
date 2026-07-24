import Link from "next/link";
import { format } from "date-fns";
import { requireTripAccess } from "@/lib/trip-access";
import { updateTripDetails, deleteTrip } from "@/app/trips/[tripId]/actions";
import { DeleteTripButton } from "../_components/DeleteTripButton";
import { IconBack } from "@/components/icons";

export default async function EditTripPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const { trip, member } = await requireTripAccess(tripId, "EDITOR");

  const updateAction = updateTripDetails.bind(null, tripId);
  const deleteAction = deleteTrip.bind(null, tripId);

  return (
    <div className="flex flex-1 flex-col px-6 pb-10 pt-[calc(env(safe-area-inset-top)+2rem)]">
      <Link
        href={`/trips/${tripId}`}
        className="flex w-fit items-center gap-0.5 text-sm font-bold text-foreground-muted"
      >
        <IconBack size={16} />
        Back
      </Link>
      <h1 className="mt-4 text-3xl font-bold tracking-tight">Edit Trip</h1>

      <form action={updateAction} className="mt-8 flex flex-col gap-5">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-bold">Trip name</span>
          <input
            name="name"
            required
            maxLength={100}
            defaultValue={trip.name}
            className="rounded-xl border border-border bg-surface px-4 py-3 text-base outline-none focus:border-primary"
          />
        </label>

        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1.5">
            <span className="text-sm font-bold">Start date</span>
            <input
              type="date"
              name="startDate"
              required
              defaultValue={format(trip.startDate, "yyyy-MM-dd")}
              className="rounded-xl border border-border bg-surface px-4 py-3 text-base outline-none focus:border-primary"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1.5">
            <span className="text-sm font-bold">End date</span>
            <input
              type="date"
              name="endDate"
              required
              defaultValue={format(trip.endDate, "yyyy-MM-dd")}
              className="rounded-xl border border-border bg-surface px-4 py-3 text-base outline-none focus:border-primary"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-bold">
            Cover photo {trip.coverImageUrl && "(replace)"}
          </span>
          <input
            type="file"
            name="cover"
            accept="image/*"
            className="rounded-xl border border-dashed border-border bg-surface px-4 py-3 text-sm font-light file:mr-3 file:rounded-full file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-bold file:text-primary-foreground"
          />
        </label>

        <button
          type="submit"
          className="mt-4 rounded-full bg-primary px-6 py-4 text-base font-bold text-primary-foreground shadow-lg active:scale-[0.98]"
        >
          Save changes
        </button>
      </form>

      {member.role === "OWNER" && (
        <div className="mt-10 border-t border-border pt-6">
          <DeleteTripButton action={deleteAction} />
        </div>
      )}
    </div>
  );
}
