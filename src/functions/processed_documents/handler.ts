import { formatJSONResponse } from "../../libs/api-gateway";
import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";

const handler = async () => {
  const client = new DynamoDBClient({ region: process.env.AWS_REGION_CONFIG });

  try {
    const command = new ScanCommand({
      TableName: process.env.AWS_TABLE_NAME,
    });
    const result = await client.send(command);

    const formattedItems = (result.Items || []).map((item) => {
      const startDate = new Date(item.start_date.S);
      const endDate = new Date(item.end_date.S);
      const durationInMinutes = Math.round(
        (endDate.getTime() - startDate.getTime()) / 60000
      );

      return {
        id: item.id.S,
        end_date: item.end_date.S,
        name: item.name.S,
        start_date: item.start_date.S,
        status: item.status.S,
        duration: !durationInMinutes
          ? ""
          : `${durationInMinutes} minute${durationInMinutes !== 1 ? "s" : ""}`,
      };
    });

    return formatJSONResponse(200, formattedItems);
  } catch (error) {
    console.error(error);
    return formatJSONResponse(500, {
      error: error.message,
    });
  }
};

export const main = handler;
