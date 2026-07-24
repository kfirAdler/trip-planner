"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconHome,
  IconItinerary,
  IconMap,
  IconStats,
  IconShare,
} from "@/components/icons";

const TABS = [
  { href: "", label: "Home", Icon: IconHome },
  { href: "/itinerary", label: "Itinerary", Icon: IconItinerary },
  { href: "/map", label: "Map", Icon: IconMap },
  { href: "/stats", label: "Stats", Icon: IconStats },
  { href: "/share", label: "Share", Icon: IconShare },
] as const;

export function TripTabBar({ tripId }: { tripId: string }) {
  const pathname = usePathname();
  const base = `/trips/${tripId}`;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-screen-sm border-t border-border bg-surface/75 backdrop-blur-xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {TABS.map(({ href, label, Icon }) => {
        const fullHref = `${base}${href}`;
        const isActive =
          href === "" ? pathname === base : pathname.startsWith(fullHref);
        return (
          <Link
            key={href}
            href={fullHref}
            className="relative flex min-h-[3.25rem] flex-1 flex-col items-center justify-center gap-0.5 text-xs"
          >
            {isActive && (
              <span
                aria-hidden
                className="absolute top-0 h-[3px] w-8 rounded-full bg-accent"
              />
            )}
            <Icon
              size={22}
              className={isActive ? "text-primary" : "text-foreground-muted"}
            />
            <span className={isActive ? "font-bold text-primary" : "font-light text-foreground-muted"}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
