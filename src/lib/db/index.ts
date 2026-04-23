const USE_MEMORY = !process.env.DYNAMODB_TABLE_NAME;

// Conditional re-export: in-memory for local dev without AWS, real DynamoDB otherwise.
// ESM static analysis requires a single export source, so we use the memory store
// as the default and the DynamoDB layer when configured.

if (USE_MEMORY) {
  // eslint-disable-next-line no-console
  console.log("[db] No DYNAMODB_TABLE_NAME — using in-memory store");
}

export {
  getVendors,
  getVendorById,
  createVendor,
  updateVendor,
  deleteVendor,
  getBAAs,
  getBAAById,
  getBAAsByStatus,
  getBAAsByVendor,
  getExpiringBAAs,
  createBAA,
  updateBAA,
  signBAA,
  deleteBAA,
  addAuditLog,
  getAuditLogsByBAA,
  getAuditLogsByVendor,
  getRecentAuditLogs,
  getClinic,
  updateClinic,
  createAuditPacket,
  getAuditPacketById,
  getAuditPackets,
  updateAuditPacket,
  deleteAuditPacket,
} from "./dynamo";
