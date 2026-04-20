import { KMSClient, SignCommand, VerifyCommand, GetPublicKeyCommand } from "@aws-sdk/client-kms";
import { logger } from "@/lib/logger";

const KMS_KEY_ID = process.env.KMS_DOCUMENT_SIGNING_KEY_ID ?? null;
const SIGNING_ALGORITHM = "ECDSA_SHA_256" as const;

let kmsClient: KMSClient | null = null;

function getClient(): KMSClient {
  if (!kmsClient) {
    kmsClient = new KMSClient({
      region: process.env.AWS_REGION ?? "us-east-1",
    });
  }
  return kmsClient;
}

/**
 * Returns true if KMS document signing is configured.
 * When false, the app still works but without cryptographic non-repudiation.
 */
export function isKmsConfigured(): boolean {
  return KMS_KEY_ID !== null && KMS_KEY_ID.length > 0;
}

/**
 * Digitally sign a document hash using AWS KMS (ECDSA_SHA_256).
 *
 * The SHA-256 hash of the PDF is signed by a FIPS 140-2 Level 3 HSM-backed key.
 * This provides non-repudiation: proof that the document was sealed at a specific
 * time using a specific key, and has not been altered since.
 *
 * Returns the base64-encoded signature and the key ARN, or null if KMS is not configured.
 */
export async function kmsSignDocumentHash(
  documentHashHex: string,
): Promise<{ signature: string; keyArn: string } | null> {
  if (!isKmsConfigured()) {
    logger.warn("KMS document signing skipped — KMS_DOCUMENT_SIGNING_KEY_ID not configured");
    return null;
  }

  try {
    // Convert hex hash to raw bytes for KMS signing
    const hashBuffer = Buffer.from(documentHashHex, "hex");

    const command = new SignCommand({
      KeyId: KMS_KEY_ID!,
      Message: hashBuffer,
      MessageType: "DIGEST", // We're passing a pre-computed SHA-256 digest
      SigningAlgorithm: SIGNING_ALGORITHM,
    });

    const response = await getClient().send(command);

    if (!response.Signature) {
      throw new Error("KMS Sign returned empty signature");
    }

    const signatureBase64 = Buffer.from(response.Signature).toString("base64");
    const keyArn = response.KeyId ?? KMS_KEY_ID!;

    logger.info("KMS digital signature created", {
      keyArn,
      algorithm: SIGNING_ALGORITHM,
      hashPrefix: documentHashHex.slice(0, 16),
    });

    return { signature: signatureBase64, keyArn };
  } catch (error) {
    logger.error("KMS Sign failed", {
      error: error instanceof Error ? error.message : String(error),
      keyId: KMS_KEY_ID,
    });
    throw error;
  }
}

/**
 * Verify a KMS digital signature against a document hash.
 *
 * Used during integrity checks to confirm that the document has not been
 * altered since it was signed by the KMS key.
 *
 * Returns true if the signature is valid, false if invalid, or null if
 * KMS is not configured (verification not possible without KMS access).
 */
export async function kmsVerifyDocumentHash(
  documentHashHex: string,
  signatureBase64: string,
  keyArn: string,
): Promise<boolean | null> {
  if (!isKmsConfigured()) {
    logger.warn("KMS verification skipped — KMS_DOCUMENT_SIGNING_KEY_ID not configured");
    return null;
  }

  try {
    const hashBuffer = Buffer.from(documentHashHex, "hex");
    const signatureBuffer = Buffer.from(signatureBase64, "base64");

    const command = new VerifyCommand({
      KeyId: keyArn,
      Message: hashBuffer,
      MessageType: "DIGEST",
      Signature: signatureBuffer,
      SigningAlgorithm: SIGNING_ALGORITHM,
    });

    const response = await getClient().send(command);
    const isValid = response.SignatureValid ?? false;

    logger.info("KMS signature verification", {
      keyArn,
      isValid,
      hashPrefix: documentHashHex.slice(0, 16),
    });

    return isValid;
  } catch (error) {
    logger.error("KMS Verify failed", {
      error: error instanceof Error ? error.message : String(error),
      keyArn,
    });
    return false;
  }
}

/**
 * Export the public key for offline verification.
 * The returned PEM can be used with OpenSSL or any crypto library to verify
 * signatures without needing AWS credentials.
 */
export async function getKmsPublicKey(): Promise<string | null> {
  if (!isKmsConfigured()) {
    return null;
  }

  try {
    const command = new GetPublicKeyCommand({ KeyId: KMS_KEY_ID! });
    const response = await getClient().send(command);

    if (!response.PublicKey) {
      throw new Error("KMS returned empty public key");
    }

    // Convert DER to PEM format
    const derBase64 = Buffer.from(response.PublicKey).toString("base64");
    const pem = `-----BEGIN PUBLIC KEY-----\n${derBase64.match(/.{1,64}/g)?.join("\n")}\n-----END PUBLIC KEY-----`;

    return pem;
  } catch (error) {
    logger.error("Failed to export KMS public key", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
