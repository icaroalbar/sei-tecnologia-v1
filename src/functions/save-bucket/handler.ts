import { APIGatewayProxyEvent } from "aws-lambda";
import { formatJSONResponse } from "../../libs/api-gateway";
import multipart from "lambda-multipart-parser";
import { saveDocumentBucket } from "../../shared/save-document-bucket";
import { saveToDynamo } from "../../shared/save-to-dynamo";
import { summarizeDocument } from "../../shared/summarize-document";

const handler = async (event: APIGatewayProxyEvent) => {
  const parsedEvent = await multipart.parse(event);
  const bucketName = process.env.AWS_BUCKET_STORE;

  if (!parsedEvent.files || parsedEvent.files.length === 0) {
    throw new Error("Arquivo não encontrado!");
  }
  const documentSaved = await saveDocumentBucket(parsedEvent, bucketName);

  try {
    await saveToDynamo({
      id: documentSaved.id,
      name: documentSaved.name,
      status: "processando",
    });
    summarizeDocument(documentSaved);

    return formatJSONResponse(201, {
      id: documentSaved.id,
      name: documentSaved.name,
      status: documentSaved.status,
    });
  } catch (error) {
    console.error(error);
    return formatJSONResponse(400, {
      error: error.message,
    });
  }
};

export const main = handler;
