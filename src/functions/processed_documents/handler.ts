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

      // --- INÍCIO DA NOVA LÓGICA DE DURAÇÃO ---

      let durationString = "";
      const durationInMs = endDate.getTime() - startDate.getTime();

      // Verificamos primeiro se o cálculo é válido
      if (!isNaN(durationInMs) && durationInMs >= 0) {
        // 1. Calculamos o total de segundos como nossa base.
        const totalSeconds = durationInMs / 1000;

        // 2. Verificamos se a duração é menor que 60 segundos.
        if (totalSeconds < 60) {
          // Se for, mostramos apenas os segundos, arredondados para o número inteiro mais próximo.
          const seconds = Math.round(totalSeconds);
          durationString = `${seconds} segundo${seconds !== 1 ? "s" : ""}`;
        } else {
          // Se for 60 segundos ou mais, quebramos em minutos e segundos.
          const minutes = Math.floor(totalSeconds / 60);
          const remainingSeconds = Math.round(totalSeconds % 60);

          let parts = [];
          parts.push(`${minutes} minuto${minutes > 1 ? "s" : ""}`);

          // Adicionamos os segundos apenas se eles existirem após o arredondamento.
          if (remainingSeconds > 0) {
            parts.push(
              `${remainingSeconds} segundo${remainingSeconds > 1 ? "s" : ""}`
            );
          }

          // Juntamos as partes com " e " para um formato legível.
          durationString = parts.join(" e ");
        }
      }

      // --- FIM DA NOVA LÓGICA DE DURAÇÃO ---

      return {
        id: item.id.S,
        end_date: item.end_date.S,
        name: item.name.S,
        start_date: item.start_date.S,
        status: item.status.S,
        duration: durationString,
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
