import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelRequest,
} from "@aws-sdk/client-bedrock-runtime";

interface ExtractedData {
  Autos: string;
  Vara: string;
  Data_da_Sentenca: string;
  Data_base_do_Calculo: string;
  Data_da_Citacao: string;
  Autor: string;
  Reu: string;
  Valor_da_Causa_ou_Condenacao: string;
  Base_da_Condenacao_Correcao_Monetaria: string;
  Indice_Correcao_Monetaria: string;
  Correcao_Monetaria_Desde: string;
  Base_da_Condenacao_Juros: string;
  Juros_a_ser_aplicado: string;
  Honorarios_Advocaticios: string;
  Custas_Processuais: string;
  Assunto_Principal: string;
  Observacoes_Relevantes?: string;
}

const bedrockClient = new BedrockRuntimeClient(process.env.AWS_REGION_CONFIG);

/**
 * Extrai dados estruturados de um texto de documento judicial usando o Anthropic Claude 3 Sonnet no Bedrock.
 * @param documentText O texto completo do documento judicial extraído (ex: via Textract).
 * @returns Uma Promessa que resolve para um objeto ExtractedData ou null em caso de erro.
 */
export async function extractDataWithClaudeSonnet(
  documentText: string
): Promise<ExtractedData | null> {
  const modelId = "anthropic.claude-3-sonnet-20240229-v1:0";

  const structuredPrompt = `
  Você é um assistente de IA altamente preciso, especializado em analisar documentos judiciais brasileiros e extrair informações específicas de forma estruturada. O texto a seguir é de um documento judicial processado por OCR.
  
  Sua tarefa é analisar o texto fornecido e extrair as informações correspondentes para preencher TODOS os campos do seguinte formato JSON. Se uma informação específica para um campo não for encontrada no texto, utilize o valor string "Indefinido" para o campo correspondente.
  
  Formato JSON de Saída Esperado:
  \`\`\`json
  {
    "Autos": "EXTRAIR NÚMERO DO PROCESSO (ex: 0000139-88.2005.8.12.0026)",
    "Vara": "EXTRAIR VARA RESPONSÁVEL (ex: 2ª Vara)",
    "Data_da_Sentenca": "EXTRAIR DATA DA SENTENÇA NO FORMATO DD/MM/AAAA (ex: 06/12/2011)",
    "Data_base_do_Calculo": "EXTRAIR DATA BASE PARA O CÁLCULO (ex: 13/09/2004 (data do evento danoso))",
    "Data_da_Citacao": "EXTRAIR DATA DA CITAÇÃO NO FORMATO DD/MM/AAAA (ex: 13/09/2004)",
    "Autor": "EXTRAIR NOME COMPLETO DO AUTOR/REQUERENTE (ex: Marcus Vinicius de Oliveira Elias)",
    "Reu": "EXTRAIR NOME COMPLETO DO RÉU/REQUERIDO (ex: Luis Eduardo Tanus)",
    "Valor_da_Causa_ou_Condenacao": "EXTRAIR VALOR PRINCIPAL DA CAUSA OU CONDENAÇÃO, INCLUINDO A MOEDA OU UNIDADE (ex: '100 Salários-Mínimos', 'R$ 50.000,00')",
    "Base_da_Condenacao_Correcao_Monetaria": "EXTRAIR FUNDAMENTAÇÃO LEGAL OU SÚMULA PARA APLICAÇÃO DA CORREÇÃO MONETÁRIA (ex: 'Súmula 362 do STJ', 'Art. 354 do Código Civil')",
    "Indice_Correcao_Monetaria": "EXTRAIR ÍNDICE DE CORREÇÃO MONETÁRIA APLICADO (ex: 'IGP-M', 'IPCA-e após 25 de março de 2015')",
    "Correcao_Monetaria_Desde": "EXTRAIR DATA OU TERMO INICIAL PARA APLICAÇÃO DA CORREÇÃO MONETÁRIA (ex: 'Data da presente decisão - 06/12/2011', 'Data do arbitramento')",
    "Base_da_Condenacao_Juros": "EXTRAIR FUNDAMENTAÇÃO LEGAL PARA APLICAÇÃO DOS JUROS (ex: 'O artigo 406 do Código Civil')",
    "Juros_a_ser_aplicado": "EXTRAIR TAXA DE JUROS APLICADA E PERIODICIDADE (ex: '1% ao mês', 'Taxa Selic')",
    "Honorarios_Advocaticios": "EXTRAIR VALOR OU PERCENTUAL DOS HONORÁRIOS E SOBRE QUAL BASE (ex: '10%', '10% sobre o valor da condenação')",
    "Custas_Processuais": "EXTRAIR INFORMAÇÃO SOBRE A RESPONSABILIDADE PELAS CUSTAS PROCESSUAIS (ex: 'Condenado ao pagamento das custas processuais', 'Custas pelo autor')",
    "Assunto_Principal": "EXTRAIR O ASSUNTO OU TEMA PRINCIPAL DA AÇÃO (ex: 'Indenização por Danos Morais', 'Ação de Cobrança')",
    "Observacoes_Relevantes": "EXTRAIR OBSERVAÇÕES IMPORTANTES OU CONTEXTUAIS SOBRE OS DADOS EXTRAÍDOS, CÁLCULOS OU FUNDAMENTAÇÕES LEGAIS CITADAS (SE PRESENTES E RELEVANTES, ex: 'Juros a ser aplicado: 1% ao mês (devido ser um cálculo de 2011, anterior a nova publicação, anexa, caso contrário deveria ser aplicado a Taxa Legal)')"
  }
  \`\`\`
  
  **Instruções Adicionais Importantes:**
  - Preste muita atenção aos detalhes e extraia as informações exatamente como aparecem no texto, a menos que uma formatação específica (como para datas DD/MM/AAAA) seja solicitada.
  - Para o campo 'Valor_da_Causa_ou_Condenacao', se houver múltiplos valores, priorize o valor principal da condenação.
  - Para 'Correcao_Monetaria_Desde', se for mencionado 'data da presente decisão' ou similar, extraia essa expressão e, se a data da decisão estiver disponível em outro lugar no texto (como no campo 'Data_da_Sentenca'), você DEVE incluí-la como parte da string, como no exemplo 'Data da presente decisão - DD/MM/AAAA'.
  - Certifique-se de que a saída seja um JSON válido.
  
  TEXTO DO DOCUMENTO PARA ANÁLISE:
  """
  ${documentText}
  """
  
  JSON EXTRAÍDO:
  `;

  const payload = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 4096,
    temperature: 0.1,

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

      {
        role: "assistant",
        content: [
          {
            type: "text",
            text: "{",
          },
        ],
      },
    ],
  };

  const invokeModelRequest: InvokeModelRequest = {
    modelId,
    contentType: "application/json",
    accept: "application/json",
    body: new TextEncoder().encode(JSON.stringify(payload)),
  };

  try {
    const command = new InvokeModelCommand(invokeModelRequest);
    const response = await bedrockClient.send(command);

    const decodedResponseBody = new TextDecoder().decode(response.body);
    const responseBodyJson = JSON.parse(decodedResponseBody);

    if (
      responseBodyJson.content &&
      Array.isArray(responseBodyJson.content) &&
      responseBodyJson.content[0] &&
      typeof responseBodyJson.content[0].text === "string"
    ) {
      const extractedJsonString = "{" + responseBodyJson.content[0].text;

      try {
        const parsedData: ExtractedData = JSON.parse(extractedJsonString);
        return parsedData;
      } catch (parseError) {
        console.error("Erro ao fazer parse do JSON extraído:", parseError);
        console.error("String JSON que falhou no parse:", extractedJsonString);
        return null;
      }
    } else {
      console.error("Estrutura de resposta inesperada:", responseBodyJson);
      return null;
    }
  } catch (error) {
    console.error("Erro ao invocar:", error);
    return null;
  }
}
