import {
  ChecksumAlgorithm,
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";

const client = new S3Client({ region: process.env.AWS_REGION_CONFIG });
const idDocument = randomUUID();

export const saveDocumentBucket = async (event, bucket) => {
  const input = {
    Body: event.files[0].content,
    Bucket: bucket,
    Key: `${idDocument}-${event.files[0].filename}`,
    ChecksumAlgorithm: ChecksumAlgorithm.SHA256,
  };

  const command = new PutObjectCommand(input);
  await client.send(command);

  console.log("Arquivo recebido:", input.Key);

  return {
    key: input.Key,
    id: idDocument,
    name: event.files[0].filename,
    status: "processando",
  };
};

export const deleteDocumentBucket = async (event, bucket) => {
  const input = {
    Bucket: bucket,
    Key: event,
  };

  const command = new DeleteObjectCommand(input);
  await client.send(command);

  console.log("Arquivo deletado:", input.Key);
};

export const saveResultBucket = async (resultJson, bucket, name) => {
  const input = {
    Body: JSON.stringify(resultJson),
    Bucket: bucket,
    Key: `${name}.json`,
    ChecksumAlgorithm: ChecksumAlgorithm.SHA256,
  };

  const command = new PutObjectCommand(input);
  await client.send(command);

  console.log("Resultado salvo:", input.Key);

  return input.Key;
};
