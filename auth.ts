import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [Google],
  callbacks: {
    // Resolves any pending TripInvite for this email into a real TripMember.
    // Runs on every sign-in (not just first-time), so it also catches an
    // existing user being invited to a second trip after their first login.
    async signIn({ user }) {
      if (!user.email || !user.id) return true;
      const email = user.email.toLowerCase();

      const pendingInvites = await prisma.tripInvite.findMany({
        where: { email, status: "PENDING" },
      });
      if (pendingInvites.length === 0) return true;

      await prisma.$transaction([
        ...pendingInvites.map((invite) =>
          prisma.tripMember.create({
            data: {
              tripId: invite.tripId,
              userId: user.id as string,
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
});
