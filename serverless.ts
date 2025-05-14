import type { AWS } from "@serverless/typescript";
import path from "path";
import { saveBucket, textract } from "./src/functions";

export const apiName = "sei-tecnologia-v1-build";

const serverlessConfiguration: AWS = {
  service: apiName,

  frameworkVersion: "4",
  plugins: ["serverless-offline"],
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
        ],
      },
    },
  },
  functions: { saveBucket, textract },
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
};

export default serverlessConfiguration;
