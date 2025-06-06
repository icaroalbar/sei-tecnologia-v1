import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelRequest,
} from "@aws-sdk/client-bedrock-runtime";

const bedrockClient = new BedrockRuntimeClient(process.env.AWS_REGION_CONFIG);

/**
 * Extrai dados estruturados de um texto de documento judicial usando o Anthropic Claude 3 Sonnet no Bedrock.
 * @param documentText O texto completo do documento judicial extraído (ex: via Textract).
 * @returns Uma Promessa que resolve para um objeto ExtractedData ou null em caso de erro.
 */
export async function extractDataWithClaudeSonnet(
  documentText: string
): Promise<any | null> {
  const structuredPrompt = `
Você é um assistente de IA altamente preciso, especializado em analisar documentos judiciais brasileiros e extrair informações específicas de forma estruturada. Sua principal responsabilidade é gerar SAÍDA APENAS EM FORMATO JSON.

O texto a seguir é de um documento judicial processado por OCR.

TEXTO DO DOCUMENTO PARA ANÁLISE:
"""
${documentText}
"""

Sua tarefa é analisar o texto fornecido e extrair as informações correspondentes para preencher TODOS os campos de informações no formato JSON.

INSTRUÇÕES CRÍTICAS PARA A SAÍDA:
1.  A sua resposta DEVE SER ESTRITAMENTE um objeto JSON válido.
2.  NÃO inclua nenhum texto explicativo, introduções, saudações, despedidas, comentários, notas ou qualquer outra coisa fora do objeto JSON.
3.  A sua resposta deve começar com o caractere '{' e terminar com o caractere '}'. Nenhum outro texto deve preceder ou suceder o objeto JSON.
4.  Certifique-se de que todas as strings dentro do JSON estejam corretamente escapadas, conforme o padrão JSON.
5.  O JSON deve conter todos os campos solicitados, preenchidos com as informações extraídas. Se uma informação específica não for encontrada no texto, utilize null ou uma string vazia "" para o valor do campo correspondente.

Responda APENAS com o objeto JSON. Não adicione nenhuma frase como "Aqui está o JSON:" ou similar.
`;

  const payload = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 4096, // Ajuste conforme a necessidade do tamanho da resposta
    temperature: 0.1, // Temperatura baixa para respostas mais factuais e menos criativas

    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: structuredPrompt,
          },
        ],
      },
    ],
  };

  const input: InvokeModelRequest = {
    modelId: "anthropic.claude-3-sonnet-20240229-v1:0",
    contentType: "application/json",
    accept: "application/json",
    body: new TextEncoder().encode(JSON.stringify(payload)),
  };

  try {
    const command = new InvokeModelCommand(input);
    const response = await bedrockClient.send(command);

    const decodedResponseBody = new TextDecoder().decode(response.body);
    const responseBodyJson = JSON.parse(decodedResponseBody);

    // Com o prompt aprimorado, esperamos que responseBodyJson.content[0].text
    // seja uma string JSON "limpa".
    // Exemplo do que esperamos em responseBodyJson.content[0].text:
    // {
    //   "tribunal": "Estado de Mato Grosso do Sul",
    //   ...
    // }

    return responseBodyJson;
  } catch (error) {
    console.error("Erro ao invocar o modelo Bedrock:", error);
    return null;
  }
}
