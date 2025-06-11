import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelRequest,
} from "@aws-sdk/client-bedrock-runtime";

const bedrockClient = new BedrockRuntimeClient(process.env.AWS_REGION_CONFIG);

export async function extractDataWithClaudeSonnet(
  documentText: string
): Promise<any | null> {
  const structuredPrompt = `
Você é um assistente jurídico altamente preciso, especializado em analisar documentos judiciais brasileiros e extrair informações específicas de forma estruturada. Sua principal responsabilidade é levantar os dados necessários para efetuar os cálculos para essas ações.

O texto a seguir é de um documento judicial processado por OCR.

TEXTO DO DOCUMENTO PARA ANÁLISE:
"""
${documentText}
"""
`;

  const payload = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 4096,
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
    console.log(responseBodyJson);
    return responseBodyJson;
  } catch (error) {
    console.error("Erro ao invocar o modelo Bedrock:", error);
    return null;
  }
}
