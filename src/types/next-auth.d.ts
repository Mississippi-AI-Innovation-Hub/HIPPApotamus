import type { UserRole } from "@/types";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
      entityId: string;
      accessToken: string;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    entityId: string;
    accessToken: string;
    refreshToken: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    entityId: string;
    accessToken: string;
    refreshToken: string;
  }
}
