import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import type { UserRole } from "@/types";
import { logger } from "@/lib/logger";

// ─── Error classes ───────────────────────────────────────────────────────────

export class UnauthorizedError extends Error {
  public readonly statusCode = 401;
  constructor(message = "Authentication required") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  public readonly statusCode = 403;
  constructor(message = "Insufficient permissions") {
    super(message);
    this.name = "ForbiddenError";
  }
}

// ─── Session user shape returned by getRequiredSession ───────────────────────

export interface RequiredSessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  entityId: string;
  accessToken: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Retrieve the current server-side session and assert that it exists.
 * Throws a 401 UnauthorizedError if there is no valid session.
 */
export async function getRequiredSession(): Promise<RequiredSessionUser> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      logger.warn("getRequiredSession: no active session");
      throw new UnauthorizedError();
    }

    return session.user as RequiredSessionUser;
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }
    logger.error("getRequiredSession: unexpected error", {
      error: String(error),
    });
    throw new UnauthorizedError();
  }
}

/**
 * Assert that the session user has the required role.
 * Throws a 403 ForbiddenError if the role does not match.
 */
export function requireRole(
  session: RequiredSessionUser,
  role: UserRole,
): void {
  if (session.role !== role) {
    logger.warn("requireRole: access denied", {
      userId: session.id,
      requiredRole: role,
      actualRole: session.role,
    });
    throw new ForbiddenError(
      `Role "${role}" is required. You have role "${session.role}".`,
    );
  }
}
