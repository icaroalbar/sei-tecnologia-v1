import type { AWS } from "@serverless/typescript";
import path from "path";
import {
  saveBucket,
  processedDocuments,
  resumeDocument,
  testStep,
} from "./src/functions";

export const apiName = "sei-tecnologia-v1-build";

const serverlessConfiguration: AWS = {
  service: apiName,

  frameworkVersion: "4",
  plugins: ["serverless-offline", "serverless-step-functions"],
  provider: {
    name: "aws",
    region: "us-east-1",
    runtime: "nodejs20.x",
    stage: '${opt:stage, "dev"}',
    apiGateway: {
      minimumCompressionSize: 1024,
      shouldStartNameWithService: true,
      binaryMediaTypes: ["*/*"],
    },
    deploymentBucket: {
      name: apiName,
    },
    environment: {
      AWS_REGION_CONFIG: "${env:AWS_REGION_CONFIG}",
      AWS_BUCKET_STORE: "${env:AWS_BUCKET_STORE}",
      AWS_BUCKET_RESULT: "${env:AWS_BUCKET_RESULT}",
      AWS_TABLE_NAME: "${env:AWS_TABLE_NAME}",
      AWS_STAGE_MACHINE: {
        "Fn::Sub":
          "arn:aws:states:${AWS::Region}:${AWS::AccountId}:stateMachine:${self:service}-document-processor-${self:provider.stage}",
      },
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
      NODE_OPTIONS: "--enable-source-maps --stack-trace-limit=1000",
    },
    iam: {
      role: {
        statements: [
          {
            Effect: "Allow",
            Action: [
              "s3:GetObject",
              "s3:GetObjectVersion",
              "s3:GetBucketLocation",
              "s3:PutObject",
            ],
            Resource: ["arn:aws:s3:::${env:AWS_BUCKET_STORE}/*"],
          },
          {
            Effect: "Allow",
            Action: ["textract:AnalyzeDocument"],
            Resource: "*",
          },
          {
            Effect: "Allow",
            Action: ["states:StartExecution"],
            Resource: {
              "Fn::Sub":
                "arn:aws:states:${AWS::Region}:${AWS::AccountId}:stateMachine:${self:service}-document-processor-${self:provider.stage}",
            },
          },
          {
            Effect: "Allow",
            Action: [
              "dynamodb:GetItem",
              "dynamodb:PutItem",
              "dynamodb:UpdateItem",
              "dynamodb:Scan",
            ],
            Resource: {
              "Fn::Sub":
                "arn:aws:dynamodb:${AWS::Region}:${AWS::AccountId}:table/${env:AWS_TABLE_NAME}",
            },
          },
        ],
      },
    },
  },
  functions: {
    saveBucket,
    processedDocuments,
    resumeDocument,
    testStep,
  },
  package: { individually: true },
  custom: {
    esbuild: {
      target: "node20",
      minify: true,
      sourcemap: true,
      bundle: true,
      external: ["aws-sdk"],
      resolveExtensions: [".mjs", ".json", ".ts", ".js"],
      alias: {
        "@modules": path.resolve(__dirname, "src/modules"),
        "@libs": path.resolve(__dirname, "src/libs"),
        "@shared": path.resolve(__dirname, "src/shared"),
      },
    },
    layers: {
      dependenciesPath: "./package.json",
      dependencies: {
        path: "./layer",
      },
    },
    serverlessOffline: {
      host: "0.0.0.0",
    },
  },
  stepFunctions: {
    stateMachines: {
      DocumentProcessor: {
        name: `${apiName}-document-processor-${"${self:provider.stage}"}`,
        definition: {
          Comment: "Processa um documento recebido do S3",
          StartAt: "ProcessDocumentTask",
          States: {
            ProcessDocumentTask: {
              Type: "Task",
              Resource:
                "arn:aws:lambda:us-east-1:554479149705:function:sei-tecnologia-v1-build-dev-testStep",
              End: true,
            },
          },
        },
      },
    },
  },
};

export default serverlessConfiguration;
