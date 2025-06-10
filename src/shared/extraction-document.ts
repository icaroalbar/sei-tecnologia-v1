import {
  TextractClient,
  JobStatus,
  StartDocumentAnalysisCommand,
  FeatureType,
  GetDocumentAnalysisCommand,
  Block,
} from "@aws-sdk/client-textract";

export interface ExtractionDocumentProps {
  key: string;
  id: string;
  bucket: string;
}

// Inicialização do cliente do Textract
const client = new TextractClient({ region: process.env.AWS_REGION_CONFIG });

export const extractionDocument = async (event: ExtractionDocumentProps) => {
  console.log(
    `Iniciando extração de texto para event.key: ${event.key}, event.id: ${event.id}`
  );

  // Validação da entrada
  if (!event.key || !event.id || !event.bucket) {
    console.error("Propriedades 'key', 'id' e 'bucket' estão ausentes.");
    throw new Error("Dados do evento incompletos.");
  }

  // --- 1. INICIAR O JOB DE ANÁLISE ---
  let jobId: string | undefined;
  try {
    const startCommand = new StartDocumentAnalysisCommand({
      DocumentLocation: {
        S3Object: {
          Bucket: event.bucket,
          Name: event.key,
        },
      },
      FeatureTypes: [FeatureType.LAYOUT],
    });
    const startResponse = await client.send(startCommand);
    jobId = startResponse.JobId;

    if (!jobId) {
      throw new Error(
        "Falha ao iniciar o job do Textract: JobId não retornado."
      );
    }
  } catch (error: any) {
    console.error(
      `Erro ao iniciar o job do Textract para ${event.key}:`,
      error.message
    );
    throw new Error(`Falha ao iniciar a análise do Textract: ${error.message}`);
  }

  // --- 2. POLLING PARA VERIFICAR O STATUS DO JOB ---
  let status: JobStatus | string | undefined = JobStatus.IN_PROGRESS;
  let attempts = 0;
  const maxAttempts = 10; // 10 tentativas * 30s = 300s (5 minutos)
  const pollingIntervalMs = 30000;

  console.log(
    `Iniciando polling para JobId ${jobId}. Máximo de ${maxAttempts} tentativas.`
  );

  let finalResponse;

  while (status === JobStatus.IN_PROGRESS && attempts < maxAttempts) {
    await new Promise((res) => setTimeout(res, pollingIntervalMs));
    attempts++;

    try {
      const getCommand = new GetDocumentAnalysisCommand({ JobId: jobId });
      finalResponse = await client.send(getCommand);
      status = finalResponse.JobStatus;
      console.log(
        `Status Textract (JobId: ${jobId}): ${status}. Tentativa: ${attempts}/${maxAttempts}`
      );
    } catch (pollingError: any) {
      console.error(
        `Erro durante o polling do Textract para JobId ${jobId}:`,
        pollingError.message
      );
      if (attempts >= maxAttempts) {
        throw new Error(`Erro no polling do Textract: ${pollingError.message}`);
      }
    }
  }

  // Tratamento de Timeout
  if (attempts >= maxAttempts && status === JobStatus.IN_PROGRESS) {
    const timeoutMessage = `Timeout: Job do Textract (${jobId}) não concluído após ${
      (attempts * pollingIntervalMs) / 1000
    } segundos.`;
    console.error(timeoutMessage);
    throw new Error(timeoutMessage);
  }

  // --- 3. PROCESSAR O RESULTADO FINAL (COM PAGINAÇÃO E FALLBACK) ---
  if (status === JobStatus.SUCCEEDED && finalResponse) {
    console.log(`Job do Textract (${jobId}) concluído com sucesso!.`);

    // Tratamento de Paginação: busca todos os blocos
    let allBlocks: Block[] = finalResponse.Blocks || [];
    let nextToken = finalResponse.NextToken;

    while (nextToken) {
      console.log(
        `Buscando página adicional de resultados para JobId ${jobId}...`
      );
      const nextPageResponse = await client.send(
        new GetDocumentAnalysisCommand({ JobId: jobId, NextToken: nextToken })
      );
      allBlocks.push(...(nextPageResponse.Blocks || []));
      nextToken = nextPageResponse.NextToken;
    }

    console.log(
      `Todos os ${allBlocks.length} blocos foram extraídos de todas as páginas.`
    );

    let documentTextContent: string;

    // Lógica de Fallback: tenta o melhor método (parágrafos), mas tem um plano B (linhas)

    // Plano A: Tentar extrair por parágrafos para um texto mais limpo
    const paragraphs = allBlocks
      .filter((block) => (block.BlockType as string) === "LAYOUT_PARAGRAPH")
      .map((p) => p.Text);

    if (paragraphs && paragraphs.length > 0) {
      console.log(
        "Extração bem-sucedida usando o método principal (LAYOUT_PARAGRAPH)."
      );
      documentTextContent = paragraphs.join("\n\n"); // Junta com parágrafo duplo
    } else {
      // Plano B: Se não houver parágrafos, usar o fallback para extrair por linhas
      console.warn(
        "Nenhum bloco LAYOUT_PARAGRAPH encontrado. Usando o método de fallback (LINE)."
      );

      const lines = allBlocks
        .filter((block) => block.BlockType === "LINE")
        .map((line) => line.Text);

      if (!lines || lines.length === 0) {
        const errorMessage = `Textract retornou sucesso para JobId ${jobId}, mas nenhum texto (nem parágrafo, nem linha) foi extraído.`;

        throw new Error(errorMessage);
      }

      documentTextContent = lines.join("\n"); // Junta com parágrafo simples
    }

    console.log(
      `JobId ${jobId}: Conteúdo completo extraído e pronto para a próxima etapa.`
    );

    return documentTextContent;
  } else {
    // Lógica de Falha
    const finalStatusMessage =
      finalResponse?.StatusMessage || `Status final inesperado: ${status}.`;
    console.error(
      `Falha no processamento do Textract para JobId ${jobId}. Status: ${status}. Mensagem: ${finalStatusMessage}`
    );
    throw new Error(
      `Job do Textract (${jobId}) não concluído com sucesso. Status: ${status}. Motivo: ${finalStatusMessage}`
    );
  }
};
