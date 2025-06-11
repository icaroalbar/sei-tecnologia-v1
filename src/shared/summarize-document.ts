import { extractDataWithClaudeSonnet } from "./aws-bedrock-claude-sonnet";
import { extractionDocument } from "./extraction-document";
import { deleteDocumentBucket, saveResultBucket } from "./save-document-bucket";
import { updateStatusById } from "./save-to-dynamo";

export interface SummarizeDocumentProps {
  key: string;
  id: string;
}

export const summarizeDocument = async (event: SummarizeDocumentProps) => {
  const bucket = process.env.AWS_BUCKET_STORE;

  if (!bucket) {
    console.error("Variável de ambiente AWS_BUCKET_STORE não está definida.");
    throw new Error("Configuração de bucket de origem ausente.");
  }

  const input = {
    key: event.key,
    id: event.id,
    bucket: bucket,
  };

  const extractedText = await extractionDocument(input);

  try {
    const resume = await extractDataWithClaudeSonnet(extractedText);
    await deleteDocumentBucket(event.key, bucket as string);
    await saveResultBucket(
      resume,
      process.env.AWS_BUCKET_RESULT as string,
      input.id
    );
    await updateStatusById(input.id, "finalizado");
  } catch (error) {
    await updateStatusById(input.id, "erro");
    throw new Error("Erro ao processar o documento.");
  }
};
