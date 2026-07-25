"use client";

import { useLinkStatus } from "next/link";

export function LinkPendingIndicator({
  className = "",
}: {
  className?: string;
}) {
  const { pending } = useLinkStatus();

  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent transition-opacity duration-150 motion-reduce:animate-none ${pending ? "opacity-100" : "opacity-0"} ${className}`}
    />
  );
}
