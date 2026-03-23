import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

interface HealthStatus {
  status: "healthy" | "degraded";
  timestamp: string;
  version: string;
  checks: {
    dynamodb: "connected" | "skipped" | "error";
  };
}

async function checkDynamoDB(): Promise<"connected" | "skipped" | "error"> {
  const tableName = process.env.DYNAMODB_TABLE_NAME;
  if (!tableName) {
    return "skipped"; // In-memory mode, no DynamoDB configured
  }

  try {
    const { DynamoDBClient, DescribeTableCommand } = await import(
      "@aws-sdk/client-dynamodb"
    );

    const client = new DynamoDBClient({
      region: process.env.AWS_REGION ?? "us-east-1",
    });

    await client.send(
      new DescribeTableCommand({ TableName: tableName })
    );

    return "connected";
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown DynamoDB error";
    logger.error("DynamoDB health check failed", { error: message });
    return "error";
  }
}

export async function GET(): Promise<NextResponse<HealthStatus>> {
  try {
    const dynamoStatus = await checkDynamoDB();

    const health: HealthStatus = {
      status: dynamoStatus === "error" ? "degraded" : "healthy",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? "0.1.0",
      checks: {
        dynamodb: dynamoStatus,
      },
    };

    const httpStatus = health.status === "healthy" ? 200 : 503;

    return NextResponse.json(health, { status: httpStatus });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    logger.error("Health check failed", { error: message });

    const failedHealth: HealthStatus = {
      status: "degraded",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? "0.1.0",
      checks: {
        dynamodb: "error",
      },
    };

    return NextResponse.json(failedHealth, { status: 503 });
  }
}
