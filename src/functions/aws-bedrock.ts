import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelRequest,
} from "@aws-sdk/client-bedrock-runtime";

const client = new BedrockRuntimeClient({
  region: "us-east-1",
});

export async function chatWithTitanPremier(prompt: string): Promise<string> {
  const modelId = "amazon.titan-text-premier-v1:0";

  const payload = {
    inputText: `Faça um resumo do texto a seguir: ${prompt}`,
    textGenerationConfig: {
      maxTokenCount: 100,
      stopSequences: [],
      temperature: 0.7,
      topP: 0.9,
    },
  };

  const input: InvokeModelRequest = {
    modelId,
    contentType: "application/json",
    accept: "application/json",
    body: new TextEncoder().encode(JSON.stringify(payload)),
  };

  const command = new InvokeModelCommand(input);
  const response = await client.send(command);

  const decoded = new TextDecoder().decode(response.body);
  const json = JSON.parse(decoded);

  console.log("Resposta do modelo:", json);
  // A resposta costuma estar em 'outputText'
  const resposta = json;
  return resposta;
}
