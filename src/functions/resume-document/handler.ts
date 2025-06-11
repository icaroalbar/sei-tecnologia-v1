import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { formatJSONResponse } from "../../libs/api-gateway"; // Sua função utilitária (NÃO MODIFICADA)
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { streamToString } from "../../shared/streamToString"; // Sua função utilitária (NÃO MODIFICADA)

// O cliente S3 permanece o mesmo
const s3 = new S3Client({ region: process.env.AWS_REGION_CONFIG });

// A função 'parseAndFormatBedrockText' foi REMOVIDA por não ser mais necessária.

const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const bucketName = process.env.AWS_BUCKET_RESULT;
  const fileId = event.pathParameters?.id;

  // Validações de entrada permanecem as mesmas
  if (!bucketName) {
    console.error("Variável de ambiente AWS_BUCKET_RESULT não está definida.");
    return formatJSONResponse(500, {
      error: "Configuração do servidor incompleta.",
    });
  }
  if (!fileId) {
    return formatJSONResponse(400, {
      error: "ID do arquivo não especificado na URL para a busca.",
    });
  }

  const s3ObjectKey = `${fileId}.json`;

  try {
    // ---- 1. Busca e Leitura do Arquivo no S3 (Lógica Inalterada) ----
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: s3ObjectKey,
    });
    const s3Response = await s3.send(command);
    const stream = s3Response.Body;

    if (!stream) {
      throw new Error(
        `Corpo da resposta do S3 para o arquivo '${s3ObjectKey}' está vazio.`
      );
    }

    const s3DataString = await streamToString(stream);
    const bedrockFullResponse = JSON.parse(s3DataString);

    // ---- 2. Extração Direta do Texto (Lógica Simplificada) ----
    // Valida a estrutura da resposta do Bedrock
    if (
      !bedrockFullResponse ||
      !Array.isArray(bedrockFullResponse.content) ||
      bedrockFullResponse.content.length === 0 ||
      !bedrockFullResponse.content[0].text
    ) {
      throw new Error(
        `Estrutura do JSON do S3 ('${s3ObjectKey}') inválida ou o campo 'content[0].text' está ausente.`
      );
    }

    // Extrai o texto plano diretamente. Não há mais necessidade de parse aninhado.
    const plainTextFromResult = bedrockFullResponse.content[0].text;

    // ---- 3. Retorno da Resposta (Lógica Simplificada) ----
    // Retornamos um objeto JSON bem formado contendo o texto extraído.
    // Sua função `formatJSONResponse` cuidará de stringuificar este objeto.
    return formatJSONResponse(200, plainTextFromResult);
  } catch (error: any) {
    // A lógica de tratamento de erros permanece a mesma, sendo robusta o suficiente.
    console.error(`Erro ao processar o arquivo '${s3ObjectKey}' do S3:`, error);

    let statusCode = 500;
    let errorMessage = "Ocorreu um erro interno ao processar sua solicitação.";

    if (error.name === "NoSuchKey") {
      statusCode = 404;
      errorMessage = `O resultado para o ID '${fileId}' não foi encontrado.`;
    } else if (error instanceof SyntaxError) {
      statusCode = 500;
      errorMessage = `O arquivo '${s3ObjectKey}' não contém um JSON válido.`;
    } else {
      statusCode = 400; // Erro genérico de dados inválidos
      errorMessage = error.message;
    }

    return formatJSONResponse(statusCode, { error: errorMessage });
  }
};

export const main = handler;
