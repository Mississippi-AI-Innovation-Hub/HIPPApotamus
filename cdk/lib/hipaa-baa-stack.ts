import {
  CfnOutput,
  CfnParameter,
  RemovalPolicy,
  Stack,
  StackProps,
  Duration,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as iam from "aws-cdk-lib/aws-iam";
import * as kms from "aws-cdk-lib/aws-kms";

export class HipaaBaaStack extends Stack {
  public readonly table: dynamodb.TableV2;
  public readonly bucket: s3.Bucket;
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly documentSigningKey: kms.Key;
  public readonly appRole: iam.Role;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // ─── Parameters ────────────────────────────────────────────────────
    const tableNameParam = new CfnParameter(this, "DynamoDBTableName", {
      type: "String",
      default: "HipaaBaaTable",
      description: "Name of the primary DynamoDB table",
    });

    const appUrlParam = new CfnParameter(this, "AppUrl", {
      type: "String",
      default: "http://localhost:3000",
      description: "Public URL of the application (used for S3 CORS)",
    });

    // ─── Resource 1: DynamoDB Table ────────────────────────────────────
    this.table = new dynamodb.TableV2(this, "HipaaBaaTable", {
      tableName: tableNameParam.valueAsString,
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
      billing: dynamodb.Billing.onDemand(),
      encryption: dynamodb.TableEncryptionV2.awsManagedKey(),
      pointInTimeRecovery: true,
      dynamoStream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      removalPolicy: RemovalPolicy.RETAIN,
      globalSecondaryIndexes: [
        {
          indexName: "GSI1",
          partitionKey: {
            name: "GSI1PK",
            type: dynamodb.AttributeType.STRING,
          },
          sortKey: {
            name: "GSI1SK",
            type: dynamodb.AttributeType.STRING,
          },
        },
        {
          indexName: "GSI2",
          partitionKey: {
            name: "GSI2PK",
            type: dynamodb.AttributeType.STRING,
          },
          sortKey: {
            name: "GSI2SK",
            type: dynamodb.AttributeType.STRING,
          },
        },
        {
          indexName: "StatusExpirationIndex",
          partitionKey: {
            name: "status",
            type: dynamodb.AttributeType.STRING,
          },
          sortKey: {
            name: "expirationDate",
            type: dynamodb.AttributeType.STRING,
          },
        },
      ],
    });

    // ─── Resource 2: S3 Bucket ─────────────────────────────────────────
    this.bucket = new s3.Bucket(this, "HipaaBaaBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: true,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.RETAIN,
      lifecycleRules: [
        {
          transitions: [
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: Duration.days(365),
            },
          ],
        },
      ],
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET],
          allowedOrigins: [appUrlParam.valueAsString],
          allowedHeaders: ["*"],
          maxAge: 3600,
        },
      ],
    });

    // ─── Resource 3: Cognito User Pool ─────────────────────────────────
    this.userPool = new cognito.UserPool(this, "HipaaBaaUserPool", {
      userPoolName: "HipaaBaaUserPool",
      selfSignUpEnabled: false,
      signInAliases: { email: true },
      autoVerify: { email: true },
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      mfa: cognito.Mfa.OPTIONAL,
      mfaSecondFactor: {
        sms: false,
        otp: true,
      },
      standardAttributes: {
        email: { required: true, mutable: true },
      },
      customAttributes: {
        role: new cognito.StringAttribute({ mutable: true }),
        entityId: new cognito.StringAttribute({ mutable: true }),
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    this.userPoolClient = this.userPool.addClient("HipaaBaaAppClient", {
      userPoolClientName: "HipaaBaaAppClient",
      authFlows: {
        userPassword: true,
      },
      generateSecret: false,
      preventUserExistenceErrors: true,
    });

    // ─── Resource 4: Secrets Manager ───────────────────────────────────
    // Secrets are created with auto-generated placeholder values.
    // After deployment, update each secret with the real API key via:
    //   aws secretsmanager put-secret-value --secret-id HipaaBaa/OpenAIKey --secret-string "<real-key>"
    new secretsmanager.Secret(this, "OpenAIKeySecret", {
      secretName: "HipaaBaa/OpenAIKey",
      description: "OpenAI API key for AI audit-packet generation",
      generateSecretString: {
        excludePunctuation: true,
        passwordLength: 32,
      },
    });

    new secretsmanager.Secret(this, "ElevenLabsKeySecret", {
      secretName: "HipaaBaa/ElevenLabsKey",
      description: "ElevenLabs API key for voice notifications",
      generateSecretString: {
        excludePunctuation: true,
        passwordLength: 32,
      },
    });

    new secretsmanager.Secret(this, "ElevenLabsVoiceIdSecret", {
      secretName: "HipaaBaa/ElevenLabsVoiceId",
      description: "ElevenLabs Voice ID for generated audio",
      generateSecretString: {
        excludePunctuation: true,
        passwordLength: 32,
      },
    });

    // ─── Resource 5: KMS Key for Document Signing ──────────────────────
    // Asymmetric ECC_NIST_P256 key for digital signatures (ECDSA_SHA_256).
    // FIPS 140-2 Level 3 validated HSMs — provides non-repudiation for
    // signed BAA documents per HIPAA Security Rule 45 CFR 164.312(c).
    this.documentSigningKey = new kms.Key(this, "DocumentSigningKey", {
      alias: "alias/hipaa-baa-document-signing",
      description: "Asymmetric key for BAA document digital signatures (ECDSA_SHA_256)",
      keySpec: kms.KeySpec.ECC_NIST_P256,
      keyUsage: kms.KeyUsage.SIGN_VERIFY,
      removalPolicy: RemovalPolicy.RETAIN,
      enabled: true,
    });

    // ─── Resource 6: IAM Role ──────────────────────────────────────────
    this.appRole = new iam.Role(this, "HipaaBaaAppRole", {
      roleName: "HipaaBaaAppRole",
      assumedBy: new iam.CompositePrincipal(
        new iam.ServicePrincipal("ec2.amazonaws.com"),
        new iam.ServicePrincipal("ecs-tasks.amazonaws.com")
      ),
      description:
        "Application role for HIPAApotamus - grants access to DynamoDB, S3, SES, Secrets Manager, and Cognito",
    });

    // DynamoDB CRUD
    this.appRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "DynamoDBCrud",
        effect: iam.Effect.ALLOW,
        actions: [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem",
        ],
        resources: [this.table.tableArn, `${this.table.tableArn}/index/*`],
      })
    );

    // DynamoDB Streams read
    this.appRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "DynamoDBStreams",
        effect: iam.Effect.ALLOW,
        actions: [
          "dynamodb:DescribeStream",
          "dynamodb:GetRecords",
          "dynamodb:GetShardIterator",
          "dynamodb:ListStreams",
        ],
        resources: [`${this.table.tableArn}/stream/*`],
      })
    );

    // S3 get/put/delete
    this.appRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "S3ReadWrite",
        effect: iam.Effect.ALLOW,
        actions: [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket",
        ],
        resources: [this.bucket.bucketArn, `${this.bucket.bucketArn}/*`],
      })
    );

    // SES send
    this.appRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "SESSend",
        effect: iam.Effect.ALLOW,
        actions: [
          "ses:SendEmail",
          "ses:SendRawEmail",
          "ses:SendTemplatedEmail",
        ],
        resources: ["*"],
      })
    );

    // Secrets Manager get
    this.appRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "SecretsManagerRead",
        effect: iam.Effect.ALLOW,
        actions: [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret",
        ],
        resources: [
          `arn:aws:secretsmanager:${this.region}:${this.account}:secret:HipaaBaa/*`,
        ],
      })
    );

    // Cognito admin ops
    this.appRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "CognitoAdmin",
        effect: iam.Effect.ALLOW,
        actions: [
          "cognito-idp:AdminCreateUser",
          "cognito-idp:AdminDeleteUser",
          "cognito-idp:AdminGetUser",
          "cognito-idp:AdminUpdateUserAttributes",
          "cognito-idp:AdminSetUserPassword",
          "cognito-idp:AdminInitiateAuth",
          "cognito-idp:AdminRespondToAuthChallenge",
          "cognito-idp:ListUsers",
        ],
        resources: [this.userPool.userPoolArn],
      })
    );

    // KMS Sign/Verify for document signing
    this.appRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "KMSDocumentSigning",
        effect: iam.Effect.ALLOW,
        actions: [
          "kms:Sign",
          "kms:Verify",
          "kms:GetPublicKey",
          "kms:DescribeKey",
        ],
        resources: [this.documentSigningKey.keyArn],
      })
    );

    // ─── Outputs ───────────────────────────────────────────────────────
    new CfnOutput(this, "TableName", {
      value: this.table.tableName,
      description: "DynamoDB table name",
      exportName: "HipaaBaa-TableName",
    });

    new CfnOutput(this, "TableArn", {
      value: this.table.tableArn,
      description: "DynamoDB table ARN",
      exportName: "HipaaBaa-TableArn",
    });

    new CfnOutput(this, "BucketName", {
      value: this.bucket.bucketName,
      description: "S3 bucket name",
      exportName: "HipaaBaa-BucketName",
    });

    new CfnOutput(this, "BucketArn", {
      value: this.bucket.bucketArn,
      description: "S3 bucket ARN",
      exportName: "HipaaBaa-BucketArn",
    });

    new CfnOutput(this, "UserPoolId", {
      value: this.userPool.userPoolId,
      description: "Cognito User Pool ID",
      exportName: "HipaaBaa-UserPoolId",
    });

    new CfnOutput(this, "UserPoolClientId", {
      value: this.userPoolClient.userPoolClientId,
      description: "Cognito User Pool Client ID",
      exportName: "HipaaBaa-UserPoolClientId",
    });

    new CfnOutput(this, "AppRoleArn", {
      value: this.appRole.roleArn,
      description: "IAM application role ARN",
      exportName: "HipaaBaa-AppRoleArn",
    });

    new CfnOutput(this, "DocumentSigningKeyArn", {
      value: this.documentSigningKey.keyArn,
      description: "KMS key ARN for document digital signatures",
      exportName: "HipaaBaa-DocumentSigningKeyArn",
    });

    new CfnOutput(this, "DocumentSigningKeyId", {
      value: this.documentSigningKey.keyId,
      description: "KMS key ID for document digital signatures (use as KMS_DOCUMENT_SIGNING_KEY_ID env var)",
      exportName: "HipaaBaa-DocumentSigningKeyId",
    });
  }
}
