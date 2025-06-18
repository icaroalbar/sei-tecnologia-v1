import type { AWS } from "@serverless/typescript";
import path from "path";
import {
  saveBucket,
  processedDocuments,
  resumeDocument,
  extractionDocument,
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
              "*", // <-- Permissão que faltava
            ],
            // Permissão para ambos os buckets, de origem e de resultado
            Resource: ["*"],
          },
          // --- Permissões para S3 ---
          // {
          //   Effect: "Allow",
          //   Action: [
          //     "s3:GetObject",
          //     "s3:PutObject",
          //     "s3:DeleteObject", // <-- Permissão que faltava
          //   ],
          //   // Permissão para ambos os buckets, de origem e de resultado
          //   Resource: [
          //     "arn:aws:s3:::${env:AWS_BUCKET_STORE}/*",
          //     "arn:aws:s3:::${env:AWS_BUCKET_RESULT}/*",
          //   ],
          // },
          // // --- Permissões para Textract (Corrigidas) ---
          // {
          //   Effect: "Allow",
          //   Action: [
          //     "textract:StartDocumentAnalysis",
          //     "textract:GetDocumentAnalysis",
          //   ],
          //   Resource: "*",
          // },
          // // --- Permissões para Bedrock (Novas) ---
          // {
          //   Effect: "Allow",
          //   Action: ["bedrock:InvokeModel"],
          //   Resource:
          //     "arn:aws:bedrock:${aws:region}::foundation-model/anthropic.claude-3-5-sonnet-20240620-v1:0",
          // },
          // // --- Permissões para Step Functions ---
          // {
          //   Effect: "Allow",
          //   Action: ["states:StartExecution"],
          //   Resource: {
          //     "Fn::Sub":
          //       "arn:aws:states:${AWS::Region}:${AWS::AccountId}:stateMachine:${self:service}-document-processor-${self:provider.stage}",
          //   },
          // },
          // // --- Permissões para DynamoDB ---
          // {
          //   Effect: "Allow",
          //   Action: [
          //     "dynamodb:GetItem",
          //     "dynamodb:PutItem",
          //     "dynamodb:UpdateItem",
          //     "dynamodb:Scan",
          //   ],
          //   Resource: {
          //     "Fn::Sub":
          //       "arn:aws:dynamodb:${AWS::Region}:${AWS::AccountId}:table/${env:AWS_TABLE_NAME}",
          //   },
          // },
        ],
      },
    },
  },
  functions: {
    saveBucket,
    processedDocuments,
    resumeDocument,
    extractionDocument,
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
          Comment: "Extrai o texto e depois exibe o resultado para debug",
          StartAt: "ExtractionDocumentTask",
          States: {
            // --- PASSO 1: Extração de Texto ---
            ExtractionDocumentTask: {
              Type: "Task",
              // Usando o ARN completo que você já tinha:
              Resource:
                "arn:aws:lambda:us-east-1:554479149705:function:sei-tecnologia-v1-build-dev-extractionDocument",
              // O Timeout deve ser definido DENTRO da Task
              TimeoutSeconds: 300,
              // Em vez de terminar, aponta para o próximo passo
              // Next: "AnalyzeDocument",
              End: true,
            },

            // --- PASSO 2: Função de Debug ---
            // AnalyzeDocument: {
            //   Type: "Task",
            //   // Construindo o ARN para a nova função de debug, seguindo o mesmo padrão.
            //   // Garanta que sua função de debug se chame 'debugStep' no bloco 'functions'.
            //   Resource: {
            //     "Fn::Sub":
            //       "arn:aws:lambda:${AWS::Region}:${AWS::AccountId}:function:${self:service}-${self:provider.stage}-analyzeDocument",
            //   },
            // Agora este é o fim do fluxo
          },
        },
      },
    },
  },
};

export default serverlessConfiguration;
