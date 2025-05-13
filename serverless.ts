import type { AWS } from "@serverless/typescript";
import path from "path";
import { extraction } from "./src";

export const apiName = `sei-tecnologia-v1-build`;

const serverlessConfiguration: AWS = {
  service: apiName,

  frameworkVersion: "4",
  plugins: ["serverless-offline"],
  provider: {
    name: "aws",
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
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
      NODE_OPTIONS: "--enable-source-maps --stack-trace-limit=1000",
    },
    iam: {
      role: {
        statements: [
          {
            Effect: "Allow",
            Action: ["*"],
            Resource: ["*"],
          },
        ],
      },
    },
  },
  functions: { extraction },
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

module.exports = serverlessConfiguration;
