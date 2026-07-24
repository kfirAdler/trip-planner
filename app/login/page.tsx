import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/trips");

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-background px-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <div className="relative flex w-full max-w-sm flex-col overflow-hidden rounded-[28px] bg-hero-bg text-hero-foreground shadow-xl">
        {/* Generic boarding-pass branding — deliberately no real trip data
            (route, dates) here: this page renders before sign-in, so actual
            itinerary specifics belong behind auth on /trips/[tripId] only. */}
        <div className="flex flex-col gap-6 px-7 pt-8 pb-6">
          <div className="flex items-center justify-between font-mono text-[0.65rem] font-bold tracking-[0.2em] text-hero-foreground/60 uppercase">
            <span>Boarding Pass</span>
            <span>Passenger Access</span>
          </div>

          <div>
            <p className="text-xs font-bold tracking-[0.25em] text-hero-accent uppercase">
              Itinerary
            </p>
            <h1 className="text-6xl leading-[0.95] font-light tracking-tight">
              Japan
              <br />
              <span className="font-bold">Trip</span>
            </h1>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs font-bold tracking-widest text-hero-foreground/80 uppercase">
            <span>Plan</span>
            <Route />
            <span>Share</span>
            <Route />
            <span>Follow along</span>
          </div>

          <div className="flex items-center border-t border-dashed border-hero-foreground/20 pt-4">
            <p className="text-sm font-light text-hero-foreground/80">
              Sign in to see your itinerary, dates, and destinations.
            </p>
          </div>
        </div>

        {/* Perforation */}
        <div className="border-t border-dashed border-hero-foreground/25" />

        {/* Boarding action */}
        <div className="flex flex-col items-center gap-4 px-7 pt-7 pb-8">
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/trips" });
            }}
            className="w-full"
          >
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-3 rounded-full bg-hero-foreground px-6 py-4 text-base font-bold text-hero-bg shadow-lg transition active:scale-[0.98]"
            >
              <GoogleLogo />
              Continue with Google
            </button>
          </form>
          <p className="px-2 text-center font-mono text-[0.7rem] font-bold tracking-widest text-hero-foreground/50 uppercase">
            Sign in to board — or accept a friend&apos;s invite
          </p>
        </div>
      </div>
    </div>
  );
}

function GoogleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34.6 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.4-.1-2.5-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.5 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l6-6C34.6 5.1 29.6 3 24 3 16 3 9.1 7.6 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 45c5.5 0 10.4-1.9 14.2-5.1l-6.6-5.4C29.6 36.2 26.9 37 24 37c-5.2 0-9.6-3.3-11.3-8l-6.6 5.1C9.1 40.4 16 45 24 45z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.3-4.1 5.7l6.6 5.4C41.7 35.6 45 30.2 45 24c0-1.4-.1-2.5-1.4-3.5z"
      />
    </svg>
  );
}

function Route() {
  return (
    <svg
      width="16"
      height="8"
      viewBox="0 0 16 8"
      aria-hidden="true"
      className="shrink-0 text-hero-foreground/40"
    >
      <line
        x1="0"
        y1="4"
        x2="16"
        y2="4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="1 3"
        strokeLinecap="round"
      />
    </svg>
  );
}
