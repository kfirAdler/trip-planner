"use client";

export function DeleteTripButton({
  action,
}: {
  action: () => void | Promise<void>;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("Delete this trip? This removes the itinerary for everyone. This cannot be undone.")) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="w-full rounded-full border border-accent px-6 py-3 text-sm font-bold text-accent active:scale-[0.98]"
      >
        Delete trip
      </button>
    </form>
  );
}
