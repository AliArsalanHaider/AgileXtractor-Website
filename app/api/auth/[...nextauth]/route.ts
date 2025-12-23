import NextAuth, { type NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

type ProfileJson = {
  name?: string;
  passwordHash?: string; // <- store bcrypt hash here if using credentials login
  // ...anything else you keep in Profile
};

export const authOptions: NextAuthOptions = {
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email:    { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase().trim();
        const password = credentials?.password ?? "";

        if (!email || !password) return null;

        // 1) Find your Registration row by email
        const reg = await prisma.registration.findUnique({
          where: { email },
          select: {
            accountId: true,
            email: true,
            totalCredits: true,
            consumedCredits: true,
            remainingCredits: true,
            active: true,
            profile: true, // JSONB
          },
        });
        if (!reg || !reg.active) return null;

        // 2) Pull name & passwordHash from profile JSON
        const profile = (reg.profile ?? {}) as ProfileJson;
        const passwordHash = profile.passwordHash;
        const nameFromProfile = profile.name;

        if (!passwordHash) {
          // You haven't stored a password hash; either:
          // - switch to OAuth/magic-link provider, or
          // - start saving bcrypt hash into profile.passwordHash during signup
          return null;
        }

        // 3) Verify password
        const ok = await bcrypt.compare(password, passwordHash);
        if (!ok) return null;

        // 4) Return a SAFE user object
        return {
          id: String(reg.accountId), // NextAuth expects string IDs
          email: reg.email,
          name: nameFromProfile ?? "", // may be empty; frontend will fallback to email prefix
          // You can add credits here, but we'll put them in JWT/session via callbacks below
        };
      },
    }),
  ],

  session: { strategy: "jwt" },

  callbacks: {
    // Put DB fields into the JWT
    async jwt({ token, user }) {
      if (user) {
        // On initial sign-in: enrich token with DB info
        // Re-read the registration row to capture credits on login
        const reg = await prisma.registration.findUnique({
          where: { email: user.email as string },
          select: {
            accountId: true,
            totalCredits: true,
            consumedCredits: true,
            remainingCredits: true,
            profile: true,
          },
        });

        token.id = (user as any).id ?? (reg ? String(reg.accountId) : undefined);
        token.name = user.name || token.name;
        token.credits = reg
          ? {
              total: reg.totalCredits,
              used: reg.consumedCredits,
              remaining: reg.remainingCredits,
            }
          : undefined;
      }
      return token;
    },

    // Expose to client
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string | undefined;
        session.user.name = (token.name as string | null) ?? session.user.name;
        (session as any).credits = token.credits as
          | { total: number; used: number; remaining: number }
          | undefined;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login", // your login page
  },

  // debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
