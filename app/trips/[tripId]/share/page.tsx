import { requireTripAccess } from "@/lib/trip-access";
import { prisma } from "@/lib/prisma";
import {
  inviteMember,
  changeMemberRole,
  removeMember,
  revokeInvite,
} from "./actions";
import { ConfirmForm } from "./_components/ConfirmForm";

export default async function SharePage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const { member: currentMember } = await requireTripAccess(tripId, "VIEWER");
  const isOwner = currentMember.role === "OWNER";

  const [members, invites] = await Promise.all([
    prisma.tripMember.findMany({
      where: { tripId },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    }),
    isOwner
      ? prisma.tripInvite.findMany({
          where: { tripId, status: "PENDING" },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  const inviteAction = inviteMember.bind(null, tripId);

  return (
    <div className="flex flex-1 flex-col gap-8 px-6 pt-[calc(env(safe-area-inset-top)+2rem)]">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Share Trip</h1>
        <p className="mt-1 text-sm font-light text-foreground-muted">
          {isOwner
            ? "Invite a friend to view or edit this trip. It'll show up in their trip list too."
            : "People who can see or edit this trip."}
        </p>
      </div>

      {isOwner && (
        <form action={inviteAction} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-bold">Invite by email</span>
            <input
              type="email"
              name="email"
              required
              placeholder="friend@example.com"
              className="rounded-xl border border-border bg-surface px-4 py-3 text-base outline-none focus:border-primary"
            />
          </label>
          <div className="flex gap-3">
            <select
              name="role"
              defaultValue="EDITOR"
              className="flex-1 rounded-xl border border-border bg-surface px-4 py-3 text-base"
            >
              <option value="EDITOR">Can edit</option>
              <option value="VIEWER">Can view</option>
            </select>
            <button
              type="submit"
              className="rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground"
            >
              Invite
            </button>
          </div>
        </form>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-foreground-muted">
          People with access
        </h2>
        <div className="flex flex-col gap-2">
          {members.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-muted text-sm font-bold">
                {(m.user.name ?? m.user.email ?? "?").slice(0, 1).toUpperCase()}
              </div>
              <div className="flex flex-1 flex-col">
                <span className="font-bold leading-tight">
                  {m.user.name ?? m.user.email}
                </span>
                <span className="text-xs font-light text-foreground-muted">
                  {m.user.email}
                </span>
              </div>

              {m.role === "OWNER" && (
                <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-bold">
                  Owner
                </span>
              )}

              {m.role !== "OWNER" && isOwner && (
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-bold text-foreground-muted">
                    {m.role === "EDITOR" ? "Can edit" : "Can view"}
                  </span>
                  <form action={changeMemberRole.bind(null, tripId, m.id, m.role === "EDITOR" ? "VIEWER" : "EDITOR")}>
                    <button
                      type="submit"
                      className="rounded-full border border-border px-3 py-1 text-xs font-bold"
                    >
                      Make {m.role === "EDITOR" ? "viewer" : "editor"}
                    </button>
                  </form>
                  <ConfirmForm
                    action={removeMember.bind(null, tripId, m.id)}
                    confirmMessage={`Remove ${m.user.name ?? m.user.email} from this trip?`}
                    label="Remove"
                    tone="danger"
                  />
                </div>
              )}

              {m.role !== "OWNER" && !isOwner && (
                <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-bold text-foreground-muted">
                  {m.role === "EDITOR" ? "Can edit" : "Can view"}
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      {isOwner && invites.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-foreground-muted">
            Pending invites
          </h2>
          <div className="flex flex-col gap-2">
            {invites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center gap-3 rounded-2xl border border-dashed border-border bg-surface p-3"
              >
                <div className="flex flex-1 flex-col">
                  <span className="font-bold leading-tight">{invite.email}</span>
                  <span className="text-xs font-light text-foreground-muted">
                    Waiting for them to sign in · {invite.role === "EDITOR" ? "Can edit" : "Can view"}
                  </span>
                </div>
                <ConfirmForm
                  action={revokeInvite.bind(null, tripId, invite.id)}
                  confirmMessage={`Revoke the invite for ${invite.email}?`}
                  label="Revoke"
                  tone="danger"
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
