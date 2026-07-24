import Link from "next/link";
import { IconMap } from "@/components/icons";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
      <IconMap size={40} className="text-foreground-muted" />
      <p className="text-lg font-bold">Not found</p>
      <p className="text-sm font-light text-foreground-muted">
        This trip doesn&apos;t exist, or you don&apos;t have access to it.
      </p>
      <Link
        href="/trips"
        className="mt-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground"
      >
        Back to my trips
      </Link>
    </div>
  );
}
