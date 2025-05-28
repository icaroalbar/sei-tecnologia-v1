import { formatJSONResponse } from "../../libs/api-gateway";
import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";

const handler = async () => {
  const client = new DynamoDBClient({ region: process.env.AWS_REGION });

  try {
    const command = new ScanCommand({
      TableName: process.env.AWS_TABLE_NAME,
    });
    const result = await client.send(command);

    return formatJSONResponse(200, result.Items || []);
  } catch (error) {
    console.error(error);
    return formatJSONResponse(500, {
      error: error.message,
    });
  }
};

export const main = handler;
