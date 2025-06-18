import {
  DynamoDBClient,
  PutItemCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({ region: process.env.AWS_REGION_CONFIG });

export interface DocumentItem {
  id: string;
  name: string;
  status: "finalizado" | "processando" | "erro";
}

export async function saveToDynamo(item: DocumentItem) {
  const TableName = process.env.AWS_TABLE_NAME;

  const input = {
    Item: {
      id: {
        S: item.id,
      },
      name: {
        S: item.name,
      },
      start_date: {
        S: new Date().toISOString(),
      },
      status: {
        S: item.status || "processando",
      },
      end_date: {
        S: "",
      },
    },
    TableName,
  };

  const command = new PutItemCommand(input);

  await client.send(command);
}

export async function updateStatusById(
  id: string,
  status: "finalizado" | "processando" | "erro"
) {
  const TableName = process.env.AWS_TABLE_NAME;

  const input = {
    TableName,
    Key: {
      id: { S: id },
    },
    UpdateExpression: "SET #s = :status, #e = :end_date",
    ExpressionAttributeNames: {
      "#s": "status",
      "#e": "end_date",
    },
    ExpressionAttributeValues: {
      ":status": { S: status },
      ":end_date": { S: new Date().toISOString() },
    },
  };

  const command = new UpdateItemCommand(input);
  await client.send(command);
}
