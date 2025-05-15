import {
  StartDocumentTextDetectionCommand,
  GetDocumentTextDetectionCommand,
  TextractClient,
} from "@aws-sdk/client-textract";

const client = new TextractClient({ region: process.env.AWS_REGION });

const handler = async (event) => {
  const bucket = process.env.AWS_BUCKET_STORE;
  const documentName = event.Records[0].s3.object.key;

  const startCommand = new StartDocumentTextDetectionCommand({
    DocumentLocation: {
      S3Object: {
        Bucket: bucket,
        Name: documentName,
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

    console.log("Textos extraídos:");
    console.log(lines.join("\n"));
  } else {
    throw new Error("Análise falhou");
  }
};

export const main = handler;
