import { APIGatewayProxyEvent } from "aws-lambda";
import { formatJSONResponse } from "../libs/api-gateway";
import multipart from "lambda-multipart-parser";

const handler = async (event: APIGatewayProxyEvent) => {
  const parsedEvent = await multipart.parse(event);

  try {
    if (!parsedEvent.files || parsedEvent.files.length === 0) {
      throw new Error("Arquivo não encontrado!");
    }

    console.log("Arquivo recebido:", parsedEvent.files[0]);

    return formatJSONResponse(201);
  } catch (error) {
    console.error(error);
    return formatJSONResponse(400, {
      error: error.message,
    });
  }
};

export const main = handler;
