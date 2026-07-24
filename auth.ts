import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

// Dev-only username/password login so this account can be tested without a
// real Google OAuth round-trip. It authenticates as the configured test user,
// or the owner of the first trip when no test email is configured. It never
// creates a separate account and is entirely excluded from production builds
// (see the `providers` array below).
const testCredentialsProvider = Credentials({
  id: "test-credentials",
  name: "Test login",
  credentials: {
    username: { label: "Username", type: "text" },
    password: { label: "Password", type: "password" },
  },
  async authorize(credentials) {
    const username = credentials?.username;
    const password = credentials?.password;
    if (
      username !== "kfir" ||
      password !== "kfir" ||
      process.env.NODE_ENV === "production"
    ) {
      return null;
    }

    const testUserEmail = process.env.AUTH_TEST_USER_EMAIL;
    if (testUserEmail) {
      return prisma.user.findUnique({ where: { email: testUserEmail } });
    }

    const firstTrip = await prisma.trip.findFirst({
      orderBy: { createdAt: "asc" },
      select: { owner: true },
    });
    return firstTrip?.owner ?? prisma.user.findFirst();
  },
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // Credentials-based sign-in isn't compatible with database sessions, so the
  // whole app uses JWT sessions once this provider is present.
  session: { strategy: "jwt" },
  providers:
    process.env.NODE_ENV === "production"
      ? [Google]
      : [Google, testCredentialsProvider],
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
