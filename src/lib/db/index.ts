const USE_MEMORY = !process.env.DYNAMODB_TABLE_NAME;

// Re-export from the appropriate backend.
// In dev (no DynamoDB), use in-memory store seeded with demo data.
// In production, use the real DynamoDB layer.

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
} from "./memoryStore";

// When DynamoDB is configured, this conditional re-export approach doesn't
// work with static ESM analysis. For production, swap this file's imports
// to point at the real DynamoDB modules (vendors.ts, baas.ts, etc.).
// TODO: Use a provider pattern or env-based dynamic import for production.
