#!/usr/bin/env node
import "source-map-support/register";
import { App } from "aws-cdk-lib";
import { HipaaBaaStack } from "../lib/hipaa-baa-stack";

const app = new App();

new HipaaBaaStack(app, "HipaaBaaStack", {
  description:
    "HIPAApotamus HIPAA BAA management infrastructure — DynamoDB, S3, Cognito, Secrets Manager, IAM",
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? "us-east-1",
  },
});
