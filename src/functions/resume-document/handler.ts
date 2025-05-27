import { APIGatewayProxyEvent } from "aws-lambda";
import { formatJSONResponse } from "../../libs/api-gateway";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { streamToString } from "../../shared/streamToString";

const s3 = new S3Client({ region: process.env.AWS_REGION });

const handler = async (event: APIGatewayProxyEvent) => {
  const bucket = process.env.AWS_BUCKET_RESULT;
  const key = event.pathParameters.id;

  if (!key) {
    return formatJSONResponse(400, {
      error: "Arquivo não especificado para a busca.",
    });
  }

  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: `${key}.json`,
    });
    const response = await s3.send(command);
    const stream = response.Body;
    const data = await streamToString(stream);
    const json = JSON.parse(data);

    return formatJSONResponse(200, json);
  } catch (error) {
    console.error(error);
    return formatJSONResponse(500, { error: error.message });
  }
};

export const main = handler;
