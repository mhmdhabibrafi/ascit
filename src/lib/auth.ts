import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

const nextAuthSecret = process.env.NEXTAUTH_SECRET;

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 10
  },
  pages: {
    signIn: "/login"
  },
  providers: [
    CredentialsProvider({
      name: "ASCIT Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        let email = credentials?.email?.toLowerCase().trim();
        const password = credentials?.password ?? "";
        if (!email || !password) return null;

        if (!email.includes("@")) {
          email = `${email}@ascit.local`;
        }

        const attempt = checkRateLimit(`login:${email}`, 8, 15 * 60 * 1000);
        if (!attempt.allowed) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          include: { role: true }
        });

        if (!user || !user.isActive) return null;
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: "LOGIN",
            module: "Autentikasi",
            description: `${user.name} login ke ASCIT.`
          }
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role.name
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id);
        session.user.role = String(token.role);
      }
      return session;
    }
  },
  events: {
    async signOut({ token }) {
      if (!token?.id) return;
      try {
        await prisma.auditLog.create({
          data: {
            userId: String(token.id),
            action: "LOGOUT",
            module: "Autentikasi",
            description: "Pengguna logout dari ASCIT."
          }
        });
      } catch (e) {
        // user might have been deleted, ignore
      }
    }
  },
  secret: nextAuthSecret
};
