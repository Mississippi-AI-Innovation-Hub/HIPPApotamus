import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { logger } from "@/lib/logger";

const USE_DEV_AUTH = !process.env.COGNITO_USER_POOL_ID;

// Dev-mode users (no Cognito required)
const DEV_USERS: Record<string, { password: string; id: string; name: string; role: "admin" | "vendor"; entityId: string }> = {
  "admin@msdh.ms.gov": {
    password: "admin123",
    id: "dev-admin-001",
    name: "Dr. Sarah Mitchell",
    role: "admin",
    entityId: "clinic-mdh-001",
  },
  "vendor@test.com": {
    password: "vendor123",
    id: "dev-vendor-001",
    name: "CareCloud Contact",
    role: "vendor",
    entityId: "vendor-001",
  },
};

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          logger.warn("Login attempt with missing credentials");
          return null;
        }

        // ── Dev mode: local hardcoded users ──
        if (USE_DEV_AUTH) {
          const devUser = DEV_USERS[credentials.email];
          if (devUser && credentials.password === devUser.password) {
            logger.info("Dev auth: login successful", { email: credentials.email });
            return {
              id: devUser.id,
              email: credentials.email,
              name: devUser.name,
              role: devUser.role,
              entityId: devUser.entityId,
              accessToken: "dev-access-token",
              refreshToken: "dev-refresh-token",
            };
          }
          logger.warn("Dev auth: invalid credentials", { email: credentials.email });
          throw new Error("Invalid email or password");
        }

        // ── Production: Cognito auth ──
        try {
          const { authenticateWithCognito, AuthError } = await import("@/lib/auth/cognito");
          const result = await authenticateWithCognito(
            credentials.email,
            credentials.password,
          );

          return {
            id: result.sub,
            email: result.email,
            name: result.name,
            role: result.role as "admin" | "vendor",
            entityId: result.entityId,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
          };
        } catch (error) {
          const { AuthError } = await import("@/lib/auth/cognito");
          if (error instanceof AuthError) {
            logger.warn("Login failed", {
              email: credentials.email,
              code: error.code,
            });
            throw new Error(error.message);
          }
          logger.error("Unexpected login error", {
            email: credentials.email,
            error: String(error),
          });
          throw new Error("Authentication service unavailable");
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      // On initial sign-in, persist user fields into the JWT
      if (user) {
        token.id = user.id;
        token.email = user.email ?? "";
        token.name = user.name ?? "";
        token.role = user.role;
        token.entityId = user.entityId;
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
      }
      return token;
    },

    async session({ session, token }) {
      session.user = {
        id: token.id,
        email: token.email,
        name: token.name,
        role: token.role,
        entityId: token.entityId,
        accessToken: token.accessToken,
      };
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  session: {
    strategy: "jwt",
    maxAge: 3600, // 1 hour
  },

  secret: process.env.NEXTAUTH_SECRET,
};
