import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, TABLE_NAME } from "./client";
import type { Clinic } from "@/types";
import { logger } from "@/lib/logger";

/** DynamoDB keys added to clinic items — stripped before returning. */
interface ClinicRecord extends Clinic {
  PK: string;
  SK: string;
  entityType: string;
}

function stripKeys(record: ClinicRecord): Clinic {
  const { PK, SK, entityType, ...clinic } = record;
  return clinic;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getClinic(id: string): Promise<Clinic | null> {
  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { PK: `CLINIC#${id}`, SK: "METADATA" },
      }),
    );
    if (!result.Item) return null;
    return stripKeys(result.Item as ClinicRecord);
  } catch (error) {
    logger.error("Failed to get clinic", {
      id,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function updateClinic(
  id: string,
  updates: Partial<Omit<Clinic, "id">>,
): Promise<Clinic | null> {
  try {
    const existing = await getClinic(id);
    if (!existing) return null;

    const updatedClinic: Clinic = {
      ...existing,
      ...updates,
      id,
    };

    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: `CLINIC#${id}`, SK: "METADATA" },
        UpdateExpression:
          "SET #name = :name, address = :address, contactName = :contactName, " +
          "contactEmail = :contactEmail, hipaaOfficer = :hipaaOfficer, npi = :npi",
        ExpressionAttributeNames: {
          "#name": "name",
        },
        ExpressionAttributeValues: {
          ":name": updatedClinic.name,
          ":address": updatedClinic.address,
          ":contactName": updatedClinic.contactName,
          ":contactEmail": updatedClinic.contactEmail,
          ":hipaaOfficer": updatedClinic.hipaaOfficer,
          ":npi": updatedClinic.npi,
        },
      }),
    );

    logger.info("Clinic updated", { clinicId: id });
    return updatedClinic;
  } catch (error) {
    logger.error("Failed to update clinic", {
      id,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
