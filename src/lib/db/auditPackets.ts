import {
  PutCommand,
  QueryCommand,
  GetCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { docClient, TABLE_NAME } from "./client";
import type { AuditPacket } from "@/types";
import { logger } from "@/lib/logger";

interface AuditPacketRecord extends AuditPacket {
  PK: string;
  SK: string;
  GSI1PK: string;
  GSI1SK: string;
  entityType: string;
}

function stripKeys(record: AuditPacketRecord): AuditPacket {
  const { PK, SK, GSI1PK, GSI1SK, entityType, ...packet } = record;
  return packet;
}

export async function createAuditPacket(packet: AuditPacket): Promise<AuditPacket> {
  const record: AuditPacketRecord = {
    ...packet,
    PK: `PACKET#${packet.id}`,
    SK: "METADATA",
    GSI1PK: `CLINIC#${packet.clinicId}`,
    GSI1SK: `PACKET#${packet.generatedAt}`,
    entityType: "AuditPacket",
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: record,
    }),
  );

  logger.info("Audit packet created", { packetId: packet.id, clinicId: packet.clinicId });
  return packet;
}

export async function getAuditPacketById(id: string): Promise<AuditPacket | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `PACKET#${id}`, SK: "METADATA" },
    }),
  );
  if (!result.Item) return null;
  return stripKeys(result.Item as AuditPacketRecord);
}

export async function getAuditPackets(clinicId: string): Promise<AuditPacket[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :pk AND begins_with(GSI1SK, :skPrefix)",
      ExpressionAttributeValues: {
        ":pk": `CLINIC#${clinicId}`,
        ":skPrefix": "PACKET#",
      },
      ScanIndexForward: false,
    }),
  );
  const items = (result.Items ?? []) as AuditPacketRecord[];
  return items.map(stripKeys);
}

export async function updateAuditPacket(packet: AuditPacket): Promise<AuditPacket> {
  // Simplest: re-put the whole record. Packets are write-once then read-only,
  // except for the initial generating -> complete/failed status flip, so a
  // full put is the cleanest option.
  return createAuditPacket(packet);
}

export async function deleteAuditPacket(id: string): Promise<boolean> {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { PK: `PACKET#${id}`, SK: "METADATA" },
    }),
  );
  logger.info("Audit packet deleted", { packetId: id });
  return true;
}
