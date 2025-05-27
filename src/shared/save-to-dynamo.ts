import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({ region: process.env.AWS_REGION });

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
      date: {
        S: new Date().toISOString(),
      },
      status: {
        S: item.status || "processando",
      },
    },
    TableName,
  };

  const command = new PutItemCommand(input);

  await client.send(command);
}
