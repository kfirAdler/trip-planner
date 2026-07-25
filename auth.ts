import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

async function acceptPendingInvites(userId: string, rawEmail: string) {
  const email = rawEmail.toLowerCase();
  const pendingInvites = await prisma.tripInvite.findMany({
    where: { email, status: "PENDING" },
  });
  if (pendingInvites.length === 0) return;

  await prisma.$transaction([
    ...pendingInvites.map((invite) =>
      prisma.tripMember.upsert({
        where: {
          tripId_userId: {
            tripId: invite.tripId,
            userId,
          },
        },
        create: {
          tripId: invite.tripId,
          userId,
          role: invite.role,
        },
        update: {
          role: invite.role,
        },
      })
    ),
    ...pendingInvites.map((invite) =>
      prisma.tripInvite.update({
        where: { id: invite.id },
        data: { status: "ACCEPTED", resolvedAt: new Date() },
      })
    ),
  ]);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [Google],
  callbacks: {
    // A returning user already has a persisted Auth.js account, so their
    // database user id is safe to use while the sign-in callback is running.
    async signIn({ user, account }) {
      if (!user.email || !account) return true;

      const persistedAccount = await prisma.account.findUnique({
        where: {
          provider_providerAccountId: {
            provider: account.provider,
            providerAccountId: account.providerAccountId,
          },
        },
        select: { userId: true },
      });
      if (persistedAccount) {
        await acceptPendingInvites(persistedAccount.userId, user.email);
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
  events: {
    // On a first Google login, signIn runs before Auth.js creates the User.
    // createUser is the first point where the real database id is available.
    async createUser({ user }) {
      if (user.id && user.email) {
        await acceptPendingInvites(user.id, user.email);
      }
    },
  },
});
