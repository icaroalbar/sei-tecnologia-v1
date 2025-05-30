import {
  StartDocumentTextDetectionCommand,
  GetDocumentTextDetectionCommand,
  TextractClient,
} from "@aws-sdk/client-textract";
// import { chatWithTitanPremier } from "./aws-bedrock-titan";
import { deleteDocumentBucket, saveResultBucket } from "./save-document-bucket";
import { updateStatusById } from "./save-to-dynamo";
import { extractDataWithClaudeSonnet } from "./aws-bedrock-claude-sonnet";

const client = new TextractClient({ region: process.env.AWS_REGION });

export const extractionDocument = async (event) => {
  const bucket = process.env.AWS_BUCKET_STORE;

  const startCommand = new StartDocumentTextDetectionCommand({
    DocumentLocation: {
      S3Object: {
        Bucket: bucket,
        Name: event.key,
      },
    },
  });

  const startResponse = await client.send(startCommand);
  const jobId = startResponse.JobId;
  console.log("Processando arquivo:", jobId);

  let status = "IN_PROGRESS";
  let response;
  while (status === "IN_PROGRESS") {
    await new Promise((res) => setTimeout(res, 5000));

    const getCommand = new GetDocumentTextDetectionCommand({ JobId: jobId });
    response = await client.send(getCommand);
    status = response.JobStatus;
    console.log("Status:", status);
  }

  if (status === "SUCCEEDED") {
    const lines = response.Blocks?.filter(
      (block) => block.BlockType === "LINE"
    ).map((line) => line.Text);

    // console.log("Textos extraídos:");
    // console.log(lines.join("\n"));

    // const resume = await chatWithTitanPremier(lines.join("\n"));
    const resume = await extractDataWithClaudeSonnet(lines.join("\n"));
    await deleteDocumentBucket(event.key, bucket);
    await saveResultBucket(resume, process.env.AWS_BUCKET_RESULT);
    await updateStatusById(event.id, "finalizado");
  } else {
    throw new Error("Análise falhou");
  }
};
