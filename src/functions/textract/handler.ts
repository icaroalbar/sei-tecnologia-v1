import {
  AnalyzeDocumentCommand,
  AnalyzeDocumentRequest,
  TextractClient,
} from "@aws-sdk/client-textract";

const handler = async (event) => {
  const client = new TextractClient({ region: process.env.AWS_REGION });

  console.log("Nome do documento", event.Records[0].s3.object.key);

  // Função para extrair os dados no formato chave-valor
  const extractAnswersAsKeyValue = (blocks) => {
    const queries = blocks.filter((b) => b.BlockType === "QUERY");

    const keyValuePairs = {};
    for (const query of queries) {
      const alias = query.Query?.Alias;
      const answerId = query.Relationships?.[0]?.Ids?.[0];

      const answerBlock = blocks.find((b) => b.Id === answerId);
      const text = answerBlock?.Text;

      if (alias && text) {
        keyValuePairs[alias] = text;
      }
    }

    return keyValuePairs;
  };

  try {
    const input: AnalyzeDocumentRequest = {
      Document: {
        S3Object: {
          Bucket: process.env.AWS_BUCKET_STORE,
          Name: event.Records[0].s3.object.key,
        },
      },
      FeatureTypes: ["QUERIES"],
      QueriesConfig: {
        Queries: [
          {
            Text: "Qual e o CNPJ do prestador do servico?",
            Alias: "CNPJ_PRESTADOR",
            // Pages: ["STRING_VALUE"],
          },
          {
            Text: "Qual e o CNPJ do tomador do servico?",
            Alias: "CNPJ_TOMADOR",
            // Pages: ["STRING_VALUE"],
          },
        ],
      },
    };

    const command = new AnalyzeDocumentCommand(input);
    const response = await client.send(command);

    // Extrair os dados chave-valor
    const resultado = extractAnswersAsKeyValue(response.Blocks);
    console.log("Resultado:", JSON.stringify(resultado, null, 2));
  } catch (error) {
    console.error("Erro ao ler objeto:", error);
    throw error;
  }
};

export const main = handler;
