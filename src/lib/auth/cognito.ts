import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  type AuthenticationResultType,
} from "@aws-sdk/client-cognito-identity-provider";
import { logger } from "@/lib/logger";

// ─── Error class ─────────────────────────────────────────────────────────────

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

// ─── JWT helpers ─────────────────────────────────────────────────────────────

interface CognitoIdTokenPayload {
  sub: string;
  email: string;
  name?: string;
  "custom:role"?: string;
  "custom:entityId"?: string;
}

function decodeJwtPayload(token: string): CognitoIdTokenPayload {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new AuthError("Malformed JWT token", "INVALID_TOKEN");
  }
  const payload = parts[1];
  const decoded = Buffer.from(payload, "base64url").toString("utf-8");
  return JSON.parse(decoded) as CognitoIdTokenPayload;
}

// ─── Cognito client (singleton) ──────────────────────────────────────────────

let clientInstance: CognitoIdentityProviderClient | null = null;

function getClient(): CognitoIdentityProviderClient {
  if (!clientInstance) {
    const region = process.env.AWS_COGNITO_REGION;
    if (!region) {
      throw new AuthError("AWS_COGNITO_REGION is not configured", "CONFIG_ERROR");
    }
    clientInstance = new CognitoIdentityProviderClient({ region });
  }
  return clientInstance;
}

// ─── Auth result ─────────────────────────────────────────────────────────────

export interface CognitoAuthResult {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  sub: string;
  email: string;
  name: string;
  role: string;
  entityId: string;
}

// ─── Main function ───────────────────────────────────────────────────────────

export async function authenticateWithCognito(
  email: string,
  password: string,
): Promise<CognitoAuthResult> {
  const clientId = process.env.AWS_COGNITO_CLIENT_ID;
  if (!clientId) {
    throw new AuthError("AWS_COGNITO_CLIENT_ID is not configured", "CONFIG_ERROR");
  }

  try {
    const client = getClient();

    const command = new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: clientId,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    });

    const response = await client.send(command);
    const authResult: AuthenticationResultType | undefined =
      response.AuthenticationResult;

    if (!authResult?.IdToken || !authResult.AccessToken) {
      throw new AuthError(
        "Authentication succeeded but tokens are missing",
        "MISSING_TOKENS",
      );
    }

    const claims = decodeJwtPayload(authResult.IdToken);

    const role = claims["custom:role"];
    if (role !== "admin" && role !== "vendor") {
      throw new AuthError(
        `Invalid role in token: ${role ?? "undefined"}`,
        "INVALID_ROLE",
      );
    }

    const entityId = claims["custom:entityId"];
    if (!entityId) {
      throw new AuthError("Missing entityId claim in token", "MISSING_ENTITY_ID");
    }

    logger.info("Cognito authentication successful", {
      email,
      role,
      sub: claims.sub,
    });

    return {
      accessToken: authResult.AccessToken,
      idToken: authResult.IdToken,
      refreshToken: authResult.RefreshToken ?? "",
      sub: claims.sub,
      email: claims.email,
      name: claims.name ?? email,
      role,
      entityId,
    };
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }

    const cognitoError = error as { name?: string; message?: string };
    logger.error("Cognito authentication failed", {
      email,
      errorName: cognitoError.name ?? "Unknown",
      errorMessage: cognitoError.message ?? "Unknown error",
    });

    if (cognitoError.name === "NotAuthorizedException") {
      throw new AuthError("Invalid email or password", "INVALID_CREDENTIALS");
    }
    if (cognitoError.name === "UserNotFoundException") {
      throw new AuthError("Invalid email or password", "INVALID_CREDENTIALS");
    }
    if (cognitoError.name === "UserNotConfirmedException") {
      throw new AuthError("Account is not confirmed", "USER_NOT_CONFIRMED");
    }

    throw new AuthError("Authentication service unavailable", "SERVICE_ERROR");
  }
}
