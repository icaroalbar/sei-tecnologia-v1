import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { formatJSONResponse } from "../../libs/api-gateway"; // Sua função utilitária (NÃO MODIFICADA)
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { streamToString } from "../../shared/streamToString"; // Sua função utilitária

const s3 = new S3Client({ region: process.env.AWS_REGION });

/**
 * Pega o array 'content' da resposta do Bedrock, extrai a string JSON do campo 'text',
 * faz o parse e a reformata com indentação.
 * (Esta função permanece a mesma da resposta anterior)
 */
function parseAndFormatBedrockText(bedrockContentArray: any[]): string {
  if (!Array.isArray(bedrockContentArray) || bedrockContentArray.length === 0) {
    throw new Error(
      "Array 'content' da resposta do Bedrock está vazio ou é inválido."
    );
  }
  const firstElement = bedrockContentArray[0];
  if (
    typeof firstElement !== "object" ||
    firstElement === null ||
    typeof firstElement.text !== "string"
  ) {
    throw new Error(
      "O primeiro elemento do array 'content' deve ser um objeto com uma propriedade 'text' do tipo string."
    );
  }
  const jsonStringFromModel: string = firstElement.text.trim();
  if (
    !jsonStringFromModel.startsWith("{") ||
    !jsonStringFromModel.endsWith("}")
  ) {
    console.warn(
      "Alerta: A string do campo 'text' não começa com '{' ou não termina com '}'. Conteúdo:",
      jsonStringFromModel
    );
  }
  try {
    const jsonObject = JSON.parse(jsonStringFromModel);
    return JSON.stringify(jsonObject, null, 2);
  } catch (error: any) {
    console.error(
      "Erro ao fazer parse do JSON contido no campo 'text' da resposta do Bedrock:",
      jsonStringFromModel
    );
    throw new Error(
      `O conteúdo do campo 'text' não é um JSON válido: ${error.message}`
    );
  }
}

const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const bucketName = process.env.AWS_BUCKET_RESULT;
  const fileId = event.pathParameters?.id;

  if (!bucketName) {
    console.error("Variável de ambiente AWS_BUCKET_RESULT não está definida.");
    // Ainda usamos formatJSONResponse para erros, pois o corpo é um objeto que será stringuificado.
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

    if (
      !bedrockFullResponse ||
      !Array.isArray(bedrockFullResponse.content) ||
      bedrockFullResponse.content.length === 0
    ) {
      throw new Error(
        `Estrutura do JSON do S3 ('${s3ObjectKey}') inválida ou o array 'content' está vazio ou ausente.`
      );
    }

    const bedrockContentArray = bedrockFullResponse.content;
    const nicelyFormattedJsonString =
      parseAndFormatBedrockText(bedrockContentArray);

    // **** INÍCIO DA ALTERAÇÃO PRINCIPAL ****
    // 1. Chame formatJSONResponse com um payload placeholder (ex: null ou {})
    //    para obter o objeto de resposta base com statusCode e headers corretos.
    //    O 'body' gerado por esta chamada será ignorado/substituído.
    //    Usar null é seguro, pois JSON.stringify(null) resulta na string "null".
    const baseResponse = formatJSONResponse(200, null);

    // 2. Agora, sobrescreva o 'body' do objeto 'baseResponse'
    //    com a sua string JSON já formatada.
    baseResponse.body = nicelyFormattedJsonString;

    // 3. Retorne o objeto 'baseResponse' modificado.
    return baseResponse;
    // **** FIM DA ALTERAÇÃO PRINCIPAL ****
  } catch (error: any) {
    console.error(`Erro ao processar o arquivo '${s3ObjectKey}' do S3:`, error);
    const errorMessage = error.message || "Ocorreu um erro desconhecido.";
    let statusCode = 400;
    if (
      error.name === "NoSuchKey" ||
      (typeof error.message === "string" && error.message.includes("NoSuchKey"))
    ) {
      statusCode = 404;
    } else if (error.message.includes("Configuração do servidor incompleta")) {
      statusCode = 500;
    }
    // Para respostas de erro, o comportamento padrão de formatJSONResponse (stringuificar um objeto de erro) é aceitável.
    return formatJSONResponse(statusCode, { error: errorMessage });
  }
};

export const main = handler;
