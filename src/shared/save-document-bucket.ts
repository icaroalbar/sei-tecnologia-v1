import {
  ChecksumAlgorithm,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";

const client = new S3Client({ region: process.env.AWS_REGION });

export const saveDocumentBucket = async (event) => {
  const idDocument = randomUUID();

  const input = {
    Body: event.files[0].content,
    Bucket: process.env.AWS_BUCKET_STORE,
    Key: `${idDocument}-${event.files[0].filename}`,
    ChecksumAlgorithm: ChecksumAlgorithm.SHA256,
  };

  const command = new PutObjectCommand(input);
  await client.send(command);

  // console.log("Arquivo recebido:", input.Key);

  return input.Key;
};
