import { APIGatewayProxyEvent } from "aws-lambda";
import { formatJSONResponse } from "../../libs/api-gateway";
import multipart from "lambda-multipart-parser";
import { saveDocumentBucket } from "../../shared/save-document-bucket";
import { extractionDocument } from "../../shared/extraction-document";
import { saveToDynamo } from "../../shared/save-to-dynamo";

const handler = async (event: APIGatewayProxyEvent) => {
  const parsedEvent = await multipart.parse(event);

  const bucketName = process.env.AWS_BUCKET_STORE;

  try {
    if (!parsedEvent.files || parsedEvent.files.length === 0) {
      throw new Error("Arquivo não encontrado!");
    }

    const documentSaved = await saveDocumentBucket(parsedEvent, bucketName);
    await saveToDynamo({
      id: documentSaved.id,
      name: documentSaved.name,
      status: "processando",
    });
    extractionDocument(documentSaved);

    return formatJSONResponse(201, documentSaved);
  } catch (error) {
    console.error(error);
    return formatJSONResponse(400, {
      error: error.message,
    });
  }
};

export const main = handler;
