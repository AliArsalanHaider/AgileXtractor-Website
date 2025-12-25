import { type NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

type ProfileJson = {
  name?: string;
  passwordHash?: string;
};

export const authOptions: NextAuthOptions = {
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase().trim();
        const password = credentials?.password ?? "";

        if (!email || !password) return null;

        const reg = await prisma.registration.findUnique({
          where: { email },
          select: {
            accountId: true,
            email: true,
            totalCredits: true,
            consumedCredits: true,
            remainingCredits: true,
            active: true,
            profile: true,
          },
        });

        if (!reg || !reg.active) return null;

        const profile = (reg.profile ?? {}) as ProfileJson;
        const passwordHash = profile.passwordHash;

        if (!passwordHash) return null;

        const ok = await bcrypt.compare(password, passwordHash);
        if (!ok) return null;

        return {
          id: String(reg.accountId),
          email: reg.email,
          name: profile.name ?? "",
        };
      },
    }),
  ],

  session: { strategy: "jwt" },

  callbacks: {
    async jwt({ token, user }) {
      if (user?.email) {
        const reg = await prisma.registration.findUnique({
          where: { email: user.email },
          select: {
            accountId: true,
            totalCredits: true,
            consumedCredits: true,
            remainingCredits: true,
          },
        });

        token.id = reg ? String(reg.accountId) : undefined;
        token.name = user.name;
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

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        session.user.name = token.name ?? session.user.name;
        (session as any).credits = token.credits;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
  },

  secret: process.env.NEXTAUTH_SECRET,
};
