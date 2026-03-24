import {
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { docClient, TABLE_NAME } from "./client";
import type { AuditLog } from "@/types";
import { logger } from "@/lib/logger";
import crypto from "node:crypto";

/** DynamoDB keys added to audit log items — stripped before returning. */
interface AuditLogRecord extends AuditLog {
  PK: string;
  SK: string;
  entityType: string;
}

function stripKeys(record: AuditLogRecord): AuditLog {
  const { PK, SK, entityType, ...log } = record;
  return log;
}

// ─── Commands & Queries ───────────────────────────────────────────────────────

export async function addAuditLog(
  data: Omit<AuditLog, "id" | "performedAt">,
): Promise<AuditLog> {
  try {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    const log: AuditLog = {
      ...data,
      id,
      performedAt: now,
    };

    const record: AuditLogRecord = {
      ...log,
      PK: `BAA#${log.baaId}`,
      SK: `LOG#${now}#${id}`,
      entityType: "AuditLog",
    };

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: record,
      }),
    );

    logger.info("Audit log added", {
      logId: id,
      baaId: log.baaId,
      action: log.action,
    });
    return log;
  } catch (error) {
    logger.error("Failed to add audit log", {
      baaId: data.baaId,
      action: data.action,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function getAuditLogsByBAA(baaId: string): Promise<AuditLog[]> {
  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: {
          ":pk": `BAA#${baaId}`,
          ":sk": "LOG#",
        },
        ScanIndexForward: false, // newest first
      }),
    );
    return (result.Items ?? []).map((item) =>
      stripKeys(item as AuditLogRecord),
    );
  } catch (error) {
    logger.error("Failed to get audit logs by BAA", {
      baaId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function getAuditLogsByVendor(
  vendorId: string,
): Promise<AuditLog[]> {
  try {
    // We need to query all BAAs for this vendor, then get logs for each
    const baaRefResult = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: {
          ":pk": `VENDOR#${vendorId}`,
          ":sk": "BAA#",
        },
      }),
    );

    const refs = baaRefResult.Items ?? [];
    if (refs.length === 0) return [];

    const allLogs = await Promise.all(
      refs.map((ref) => {
        const baaId = (ref as { baaId: string }).baaId;
        return getAuditLogsByBAA(baaId);
      }),
    );

    return allLogs
      .flat()
      .sort(
        (a, b) =>
          new Date(b.performedAt).getTime() -
          new Date(a.performedAt).getTime(),
      );
  } catch (error) {
    logger.error("Failed to get audit logs by vendor", {
      vendorId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function getRecentAuditLogs(
  limit: number = 50,
): Promise<AuditLog[]> {
  try {
    // Since audit logs are partitioned by BAA, we need a different approach.
    // We'll query across known BAA partitions. In production, we'd use a GSI
    // or a separate "recent logs" partition. For now, we scan with a limit.
    const { ScanCommand } = await import("@aws-sdk/lib-dynamodb");

    // Paginate through the entire table to find all audit logs.
    // DynamoDB Scan with filter only applies Limit to items scanned (not results),
    // so we must paginate to ensure we find all matching records.
    let allItems: Record<string, unknown>[] = [];
    let lastKey: Record<string, unknown> | undefined;

    do {
      const result = await docClient.send(
        new ScanCommand({
          TableName: TABLE_NAME,
          FilterExpression: "entityType = :et",
          ExpressionAttributeValues: { ":et": "AuditLog" },
          ExclusiveStartKey: lastKey,
        }),
      );
      allItems = allItems.concat(result.Items ?? []);
      lastKey = result.LastEvaluatedKey;
    } while (lastKey);

    const logs = allItems
      .map((item) => stripKeys(item as unknown as AuditLogRecord))
      .sort(
        (a, b) =>
          new Date(b.performedAt).getTime() -
          new Date(a.performedAt).getTime(),
      );

    return logs.slice(0, limit);
  } catch (error) {
    logger.error("Failed to get recent audit logs", {
      limit,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
