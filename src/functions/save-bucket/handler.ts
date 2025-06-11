import { APIGatewayProxyEvent } from "aws-lambda";
import { formatJSONResponse } from "../../libs/api-gateway";
import multipart from "lambda-multipart-parser";
import { saveDocumentBucket } from "../../shared/save-document-bucket";
import { saveToDynamo } from "../../shared/save-to-dynamo";
import {
  SFNClient,
  StartExecutionCommand,
  StartExecutionInput,
} from "@aws-sdk/client-sfn";

const handler = async (event: APIGatewayProxyEvent) => {
  const parsedEvent = await multipart.parse(event);
  const bucketName = process.env.AWS_BUCKET_STORE;

  if (!parsedEvent.files || parsedEvent.files.length === 0) {
    throw new Error("Arquivo não encontrado!");
  }
  const documentSaved = await saveDocumentBucket(parsedEvent, bucketName);
  const sfnClient = new SFNClient({ region: process.env.AWS_REGION_CONFIG });

  try {
    await saveToDynamo({
      id: documentSaved.id,
      name: documentSaved.name,
      status: "processando",
    });

    const input: StartExecutionInput = {
      stateMachineArn: process.env.AWS_STAGE_MACHINE!,
      input: JSON.stringify({
        id: documentSaved.id,
        bucket: bucketName,
        key: documentSaved.key,
      }),
    };

    const command = new StartExecutionCommand(input);
    await sfnClient.send(command);

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
