/**
 * Reset script — deletes all records from the HIPAApotamus DynamoDB table.
 *
 * Usage:
 *   npx tsx scripts/reset.ts
 */

import { ScanCommand, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, TABLE_NAME } from "../src/lib/db/client";

async function reset(): Promise<void> {
  /* eslint-disable no-console */
  console.log(`Resetting table: ${TABLE_NAME}`);

  let lastKey: Record<string, unknown> | undefined;
  let totalDeleted = 0;

  do {
    const scan = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        ProjectionExpression: "PK, SK",
        ExclusiveStartKey: lastKey,
      }),
    );

    const items = scan.Items ?? [];
    lastKey = scan.LastEvaluatedKey as Record<string, unknown> | undefined;

    if (items.length === 0) continue;

    // BatchWrite supports max 25 items per request
    for (let i = 0; i < items.length; i += 25) {
      const batch = items.slice(i, i + 25);
      await docClient.send(
        new BatchWriteCommand({
          RequestItems: {
            [TABLE_NAME]: batch.map((item) => ({
              DeleteRequest: {
                Key: { PK: item["PK"], SK: item["SK"] },
              },
            })),
          },
        }),
      );
      totalDeleted += batch.length;
    }

    console.log(`Deleted ${totalDeleted} records so far...`);
  } while (lastKey);

  console.log(`Reset complete. Deleted ${totalDeleted} total records.`);
  /* eslint-enable no-console */
}

reset().catch((err) => {
  /* eslint-disable no-console */
  console.error("Reset failed:", err);
  process.exit(1);
  /* eslint-enable no-console */
});
