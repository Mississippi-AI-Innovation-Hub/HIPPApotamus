/**
 * Smart re-export: uses real DynamoDB when DYNAMODB_TABLE_NAME is set,
 * falls back to in-memory store otherwise.
 */

const USE_DYNAMO = !!process.env.DYNAMODB_TABLE_NAME;

// We can't conditionally re-export in ESM, so we use a dynamic approach.
// At module load time, we pick the right implementation.

import * as memory from "./memoryStore";
import * as vendorsDb from "./vendors";
import * as baasDb from "./baas";
import * as auditDb from "./auditLogs";
import * as clinicDb from "./clinic";

// Vendor operations
export const getVendors = USE_DYNAMO ? vendorsDb.getVendors : memory.getVendors;
export const getVendorById = USE_DYNAMO ? vendorsDb.getVendorById : memory.getVendorById;
export const createVendor = USE_DYNAMO ? vendorsDb.createVendor : memory.createVendor;
export const updateVendor = USE_DYNAMO ? vendorsDb.updateVendor : memory.updateVendor;
export const deleteVendor = USE_DYNAMO ? vendorsDb.deleteVendor : memory.deleteVendor;

// BAA operations
export const getBAAs = USE_DYNAMO ? baasDb.getBAAs : memory.getBAAs;
export const getBAAById = USE_DYNAMO ? baasDb.getBAAById : memory.getBAAById;
export const getBAAsByStatus = USE_DYNAMO ? baasDb.getBAAsByStatus : memory.getBAAsByStatus;
export const getBAAsByVendor = USE_DYNAMO ? baasDb.getBAAsByVendor : memory.getBAAsByVendor;
export const getExpiringBAAs = USE_DYNAMO ? baasDb.getExpiringBAAs : memory.getExpiringBAAs;
export const createBAA = USE_DYNAMO ? baasDb.createBAA : memory.createBAA;
export const updateBAA = USE_DYNAMO ? baasDb.updateBAA : memory.updateBAA;
export const signBAA = USE_DYNAMO ? baasDb.signBAA : memory.signBAA;
export const deleteBAA = USE_DYNAMO ? baasDb.deleteBAA : memory.deleteBAA;

// Audit log operations
export const addAuditLog = USE_DYNAMO ? auditDb.addAuditLog : memory.addAuditLog;
export const getAuditLogsByBAA = USE_DYNAMO ? auditDb.getAuditLogsByBAA : memory.getAuditLogsByBAA;
export const getAuditLogsByVendor = USE_DYNAMO ? auditDb.getAuditLogsByVendor : memory.getAuditLogsByVendor;
export const getRecentAuditLogs = USE_DYNAMO ? auditDb.getRecentAuditLogs : memory.getRecentAuditLogs;

// Clinic operations
export const getClinic = USE_DYNAMO ? clinicDb.getClinic : memory.getClinic;
export const updateClinic = USE_DYNAMO ? clinicDb.updateClinic : memory.updateClinic;
