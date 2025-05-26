import {
  ChecksumAlgorithm,
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";

const client = new S3Client({ region: process.env.AWS_REGION });
const bucketName = process.env.AWS_BUCKET_STORE;

export const saveDocumentBucket = async (event) => {
  const idDocument = randomUUID();

  const input = {
    Body: event.files[0].content,
    Bucket: bucketName,
    Key: `${idDocument}-${event.files[0].filename}`,
    ChecksumAlgorithm: ChecksumAlgorithm.SHA256,
  };

  const command = new PutObjectCommand(input);
  await client.send(command);

  console.log("Arquivo recebido:", input.Key);

  return input.Key;
};

export const deleteDocumentBucket = async (event) => {
  const input = {
    Bucket: bucketName,
    Key: event,
  };

  const command = new DeleteObjectCommand(input);
  await client.send(command);

  console.log("Arquivo deletado:", input.Key);
};
