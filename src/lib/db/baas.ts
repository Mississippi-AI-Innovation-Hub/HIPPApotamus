import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { docClient, TABLE_NAME } from "./client";
import type { BAA, BAAStatus, SigningCertificate, SignedSnapshot } from "@/types";
import { logger } from "@/lib/logger";
import crypto from "node:crypto";

/** DynamoDB keys added to BAA items — stripped before returning. */
interface BAARecord extends BAA {
  PK: string;
  SK: string;
  GSI1PK: string;
  GSI1SK: string;
  entityType: string;
}

/** The vendor-BAA cross-reference record (PK=VENDOR#vendorId, SK=BAA#id). */
interface BAAVendorRef {
  PK: string;
  SK: string;
  baaId: string;
  vendorId: string;
  clinicId: string;
  entityType: string;
}

function stripKeys(record: BAARecord): BAA {
  const { PK, SK, GSI1PK, GSI1SK, entityType, ...baa } = record;
  return baa;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getBAAs(clinicId: string): Promise<BAA[]> {
  try {
    // Use a scan with filter since we don't have a GSI keyed on clinicId for BAAs.
    // For a small table this is acceptable; at scale we'd add a GSI.
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: "GSI1",
        KeyConditionExpression: "GSI1PK = :pk",
        FilterExpression: "clinicId = :clinicId AND entityType = :et",
        ExpressionAttributeValues: {
          ":pk": `STATUS#active`,
          ":clinicId": clinicId,
          ":et": "BAA",
        },
      }),
    );

    // Also query other statuses
    const statuses: BAAStatus[] = [
      "expiring_soon",
      "expired",
      "pending_signature",
      "pending_countersignature",
      "terminated",
      "declined",
    ];
    const otherResults = await Promise.all(
      statuses.map((status) =>
        docClient.send(
          new QueryCommand({
            TableName: TABLE_NAME,
            IndexName: "GSI1",
            KeyConditionExpression: "GSI1PK = :pk",
            FilterExpression: "clinicId = :clinicId AND entityType = :et",
            ExpressionAttributeValues: {
              ":pk": `STATUS#${status}`,
              ":clinicId": clinicId,
              ":et": "BAA",
            },
          }),
        ),
      ),
    );

    const allItems = [
      ...(result.Items ?? []),
      ...otherResults.flatMap((r) => r.Items ?? []),
    ];

    return allItems.map((item) => stripKeys(item as BAARecord));
  } catch (error) {
    logger.error("Failed to get BAAs", {
      clinicId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function getBAAById(id: string): Promise<BAA | null> {
  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { PK: `BAA#${id}`, SK: "METADATA" },
      }),
    );
    if (!result.Item) return null;
    return stripKeys(result.Item as BAARecord);
  } catch (error) {
    logger.error("Failed to get BAA by id", {
      id,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function getBAAsByStatus(status: BAAStatus): Promise<BAA[]> {
  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: "GSI1",
        KeyConditionExpression: "GSI1PK = :pk",
        FilterExpression: "entityType = :et",
        ExpressionAttributeValues: {
          ":pk": `STATUS#${status}`,
          ":et": "BAA",
        },
      }),
    );
    return (result.Items ?? []).map((item) => stripKeys(item as BAARecord));
  } catch (error) {
    logger.error("Failed to get BAAs by status", {
      status,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function getBAAsByVendor(vendorId: string): Promise<BAA[]> {
  try {
    // Query the VENDOR#vendorId / BAA# cross-ref records
    const refResult = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: {
          ":pk": `VENDOR#${vendorId}`,
          ":sk": "BAA#",
        },
      }),
    );

    const refs = (refResult.Items ?? []) as BAAVendorRef[];
    if (refs.length === 0) return [];

    // Fetch each BAA by id
    const baas = await Promise.all(
      refs.map((ref) => getBAAById(ref.baaId)),
    );

    return baas.filter((baa): baa is BAA => baa !== null);
  } catch (error) {
    logger.error("Failed to get BAAs by vendor", {
      vendorId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function getExpiringBAAs(daysThreshold: number): Promise<BAA[]> {
  try {
    const now = new Date();
    const thresholdDate = new Date(
      now.getTime() + daysThreshold * 24 * 60 * 60 * 1000,
    );
    const thresholdIso = thresholdDate.toISOString();

    // Query active BAAs and filter by expiration date
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: "GSI1",
        KeyConditionExpression:
          "GSI1PK = :pk AND GSI1SK <= :threshold",
        FilterExpression: "entityType = :et",
        ExpressionAttributeValues: {
          ":pk": "STATUS#active",
          ":threshold": `EXPIRY#${thresholdIso}`,
          ":et": "BAA",
        },
      }),
    );

    // Also check expiring_soon status
    const expiringSoonResult = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: "GSI1",
        KeyConditionExpression:
          "GSI1PK = :pk AND GSI1SK <= :threshold",
        FilterExpression: "entityType = :et",
        ExpressionAttributeValues: {
          ":pk": "STATUS#expiring_soon",
          ":threshold": `EXPIRY#${thresholdIso}`,
          ":et": "BAA",
        },
      }),
    );

    const allItems = [
      ...(result.Items ?? []),
      ...(expiringSoonResult.Items ?? []),
    ];

    return allItems.map((item) => stripKeys(item as BAARecord));
  } catch (error) {
    logger.error("Failed to get expiring BAAs", {
      daysThreshold,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function createBAA(
  data: Omit<BAA, "id" | "createdAt" | "updatedAt">,
): Promise<BAA> {
  try {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    const baa: BAA = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };

    // Main BAA record
    const record: BAARecord = {
      ...baa,
      PK: `BAA#${id}`,
      SK: "METADATA",
      GSI1PK: `STATUS#${baa.status}`,
      GSI1SK: `EXPIRY#${baa.expirationDate}`,
      entityType: "BAA",
    };

    // Vendor cross-reference record
    const vendorRef: BAAVendorRef = {
      PK: `VENDOR#${baa.vendorId}`,
      SK: `BAA#${id}`,
      baaId: id,
      vendorId: baa.vendorId,
      clinicId: baa.clinicId,
      entityType: "BAAVendorRef",
    };

    await Promise.all([
      docClient.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: record,
          ConditionExpression: "attribute_not_exists(PK)",
        }),
      ),
      docClient.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: vendorRef,
        }),
      ),
    ]);

    logger.info("BAA created", { baaId: id, vendorId: baa.vendorId });
    return baa;
  } catch (error) {
    logger.error("Failed to create BAA", {
      vendorId: data.vendorId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function updateBAA(
  id: string,
  updates: Partial<Omit<BAA, "id" | "createdAt">>,
): Promise<BAA | null> {
  try {
    const existing = await getBAAById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const updatedBAA: BAA = {
      ...existing,
      ...updates,
      id,
      createdAt: existing.createdAt,
      updatedAt: now,
    };

    // Build dynamic update expression
    const expressionParts: string[] = [];
    const expressionValues: Record<string, unknown> = {};
    const expressionNames: Record<string, string> = {};

    const fieldsToUpdate: Record<string, unknown> = {
      vendorId: updatedBAA.vendorId,
      clinicId: updatedBAA.clinicId,
      contractType: updatedBAA.contractType,
      status: updatedBAA.status,
      effectiveDate: updatedBAA.effectiveDate,
      expirationDate: updatedBAA.expirationDate,
      signedDate: updatedBAA.signedDate,
      signedBy: updatedBAA.signedBy,
      documentUrl: updatedBAA.documentUrl,
      signedDocumentUrl: updatedBAA.signedDocumentUrl,
      signedDocumentHash: updatedBAA.signedDocumentHash,
      kmsSignature: updatedBAA.kmsSignature,
      kmsKeyArn: updatedBAA.kmsKeyArn,
      signingCertificate: updatedBAA.signingCertificate,
      signedSnapshot: updatedBAA.signedSnapshot,
      documentVersion: updatedBAA.documentVersion,
      parentBaaId: updatedBAA.parentBaaId,
      versionType: updatedBAA.versionType,
      templateVersion: updatedBAA.templateVersion,
      termYears: updatedBAA.termYears,
      requiresStateLawRetentionNotice:
        updatedBAA.requiresStateLawRetentionNotice,
      source: updatedBAA.source,
      uploadedBy: updatedBAA.uploadedBy,
      uploadedAt: updatedBAA.uploadedAt,
      legalReviewedBy: updatedBAA.legalReviewedBy,
      legalReviewedAt: updatedBAA.legalReviewedAt,
      updatedAt: now,
      GSI1PK: `STATUS#${updatedBAA.status}`,
      GSI1SK: `EXPIRY#${updatedBAA.expirationDate}`,
    };

    let i = 0;
    for (const [key, value] of Object.entries(fieldsToUpdate)) {
      if (value === undefined) continue;
      const nameAlias = `#f${i}`;
      const valueAlias = `:v${i}`;
      expressionNames[nameAlias] = key;
      expressionValues[valueAlias] = value;
      expressionParts.push(`${nameAlias} = ${valueAlias}`);
      i++;
    }

    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: `BAA#${id}`, SK: "METADATA" },
        UpdateExpression: `SET ${expressionParts.join(", ")}`,
        ExpressionAttributeNames: expressionNames,
        ExpressionAttributeValues: expressionValues,
      }),
    );

    logger.info("BAA updated", { baaId: id });
    return updatedBAA;
  } catch (error) {
    logger.error("Failed to update BAA", {
      id,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function signBAA(
  id: string,
  signedBy: string,
  extra?: {
    signedDocumentUrl?: string | null;
    signingCertificate?: SigningCertificate | null;
    signedSnapshot?: SignedSnapshot | null;
  },
): Promise<BAA | null> {
  try {
    const now = new Date().toISOString();
    return await updateBAA(id, {
      status: "pending_countersignature",
      signedDate: now,
      signedBy,
      ...(extra?.signedDocumentUrl !== undefined && { signedDocumentUrl: extra.signedDocumentUrl }),
      ...(extra?.signingCertificate !== undefined && { signingCertificate: extra.signingCertificate }),
      ...(extra?.signedSnapshot !== undefined && { signedSnapshot: extra.signedSnapshot }),
    });
  } catch (error) {
    logger.error("Failed to sign BAA", {
      id,
      signedBy,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function deleteBAA(id: string): Promise<boolean> {
  try {
    const baa = await getBAAById(id);
    if (!baa) return false;

    // Delete main record and vendor cross-reference
    await Promise.all([
      docClient.send(
        new DeleteCommand({
          TableName: TABLE_NAME,
          Key: { PK: `BAA#${id}`, SK: "METADATA" },
        }),
      ),
      docClient.send(
        new DeleteCommand({
          TableName: TABLE_NAME,
          Key: { PK: `VENDOR#${baa.vendorId}`, SK: `BAA#${id}` },
        }),
      ),
    ]);

    logger.info("BAA deleted", { baaId: id, vendorId: baa.vendorId });
    return true;
  } catch (error) {
    logger.error("Failed to delete BAA", {
      id,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}
