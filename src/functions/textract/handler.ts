import {
  AnalyzeDocumentCommand,
  AnalyzeDocumentRequest,
  TextractClient,
} from "@aws-sdk/client-textract";

const handler = async (event) => {
  const client = new TextractClient({ region: process.env.AWS_REGION });

  console.log("Nome do documento", event.Records[0].s3.object.key);

  try {
    const input: AnalyzeDocumentRequest = {
      Document: {
        S3Object: {
          Bucket: process.env.AWS_BUCKET_STORE,
          Name: event.Records[0].s3.object.key,
        },
      },
      FeatureTypes: ["FORMS"],
    };

    const command = new AnalyzeDocumentCommand(input);
    const response = await client.send(command);

    console.log("Resultado:", JSON.stringify(response, null, 2));
  } catch (error) {
    console.error("Erro ao ler objeto:", error);
    throw error;
  }
};

export const main = handler;
