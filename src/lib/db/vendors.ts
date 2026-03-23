import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { docClient, TABLE_NAME } from "./client";
import type { Vendor } from "@/types";
import { logger } from "@/lib/logger";
import crypto from "node:crypto";

/** DynamoDB keys added to vendor items — stripped before returning. */
interface VendorRecord extends Vendor {
  PK: string;
  SK: string;
  GSI1PK: string;
  GSI1SK: string;
  entityType: string;
}

function stripKeys(record: VendorRecord): Vendor {
  const { PK, SK, GSI1PK, GSI1SK, entityType, ...vendor } = record;
  return vendor;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getVendors(clinicId: string): Promise<Vendor[]> {
  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: "GSI1",
        KeyConditionExpression: "GSI1PK = :pk AND begins_with(GSI1SK, :sk)",
        ExpressionAttributeValues: {
          ":pk": `CLINIC#${clinicId}`,
          ":sk": "VENDOR#",
        },
      }),
    );
    return (result.Items ?? []).map((item) => stripKeys(item as VendorRecord));
  } catch (error) {
    logger.error("Failed to get vendors", {
      clinicId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function getVendorById(id: string): Promise<Vendor | null> {
  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { PK: `VENDOR#${id}`, SK: "METADATA" },
      }),
    );
    if (!result.Item) return null;
    return stripKeys(result.Item as VendorRecord);
  } catch (error) {
    logger.error("Failed to get vendor by id", {
      id,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function createVendor(
  data: Omit<Vendor, "id" | "createdAt" | "updatedAt">,
  clinicId: string,
): Promise<Vendor> {
  try {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    const vendor: Vendor = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };

    const record: VendorRecord = {
      ...vendor,
      PK: `VENDOR#${id}`,
      SK: "METADATA",
      GSI1PK: `CLINIC#${clinicId}`,
      GSI1SK: `VENDOR#${id}`,
      entityType: "Vendor",
    };

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: record,
        ConditionExpression: "attribute_not_exists(PK)",
      }),
    );

    logger.info("Vendor created", { vendorId: id, name: vendor.name });
    return vendor;
  } catch (error) {
    logger.error("Failed to create vendor", {
      name: data.name,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function updateVendor(
  id: string,
  updates: Partial<Omit<Vendor, "id" | "createdAt">>,
): Promise<Vendor | null> {
  try {
    const existing = await getVendorById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const updatedVendor: Vendor = {
      ...existing,
      ...updates,
      id,
      createdAt: existing.createdAt,
      updatedAt: now,
    };

    // We need to reconstruct the full record to preserve GSI keys
    // Use a conditional put to replace the item
    const result = await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: `VENDOR#${id}`, SK: "METADATA" },
        UpdateExpression:
          "SET #name = :name, #type = :type, contractType = :contractType, " +
          "contactName = :contactName, contactEmail = :contactEmail, " +
          "contactPhone = :contactPhone, address = :address, " +
          "requiresSubcontractorCompliance = :rsc, requiresSoc2Report = :rsr, " +
          "breachNotificationSLADays = :bnsla, updatedAt = :updatedAt",
        ExpressionAttributeNames: {
          "#name": "name",
          "#type": "type",
        },
        ExpressionAttributeValues: {
          ":name": updatedVendor.name,
          ":type": updatedVendor.type,
          ":contractType": updatedVendor.contractType,
          ":contactName": updatedVendor.contactName,
          ":contactEmail": updatedVendor.contactEmail,
          ":contactPhone": updatedVendor.contactPhone,
          ":address": updatedVendor.address,
          ":rsc": updatedVendor.requiresSubcontractorCompliance,
          ":rsr": updatedVendor.requiresSoc2Report,
          ":bnsla": updatedVendor.breachNotificationSLADays,
          ":updatedAt": now,
        },
        ReturnValues: "ALL_NEW",
      }),
    );

    logger.info("Vendor updated", { vendorId: id });
    return result.Attributes
      ? stripKeys(result.Attributes as VendorRecord)
      : updatedVendor;
  } catch (error) {
    logger.error("Failed to update vendor", {
      id,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function deleteVendor(id: string): Promise<boolean> {
  try {
    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { PK: `VENDOR#${id}`, SK: "METADATA" },
        ConditionExpression: "attribute_exists(PK)",
      }),
    );
    logger.info("Vendor deleted", { vendorId: id });
    return true;
  } catch (error) {
    logger.error("Failed to delete vendor", {
      id,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}
