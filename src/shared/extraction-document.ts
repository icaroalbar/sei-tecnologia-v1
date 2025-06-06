import {
  StartDocumentTextDetectionCommand,
  GetDocumentTextDetectionCommand,
  TextractClient,
  JobStatus,
} from "@aws-sdk/client-textract";

export interface ExtractionDocumentProps {
  key: string;
  id: string;
  bucket: string;
}

const client = new TextractClient({ region: process.env.AWS_REGION_CONFIG });

export const extractionDocument = async (event: ExtractionDocumentProps) => {
  console.log(
    `Iniciando extração de texto para event.key: ${event.key}, event.id: ${event.id}`
  );

  if (!event.key || !event.id || !event.bucket) {
    console.error("Propriedades 'key', 'id' e 'bucket' estão ausentes.");
    throw new Error("Dados do evento incompletos.");
  }

  let jobId: string | undefined;

  try {
    const startCommand = new StartDocumentTextDetectionCommand({
      DocumentLocation: {
        S3Object: {
          Bucket: event.bucket,
          Name: event.key,
        },
      },
    });
    const startResponse = await client.send(startCommand);
    jobId = startResponse.JobId;

    if (!jobId) {
      console.error(
        "Não foi possível obter JobId do Textract após iniciar a detecção."
      );
      throw new Error(
        "Falha ao iniciar o job do Textract: JobId não retornado."
      );
    }
  } catch (error: any) {
    console.error(
      `Erro ao iniciar o job do Textract para ${event.key}:`,
      error.message
    );
    if (error.stack) console.error(error.stack);
    throw new Error(`Falha ao iniciar a análise do Textract: ${error.message}`);
  }

  let status: JobStatus | string | undefined = JobStatus.IN_PROGRESS; // Usar JobStatus do SDK
  let response;
  let attempts = 0;
  const maxAttempts = 6; // 6 tentativas * 30 segundos = 180 segundos (3 minutos)
  const pollingIntervalMs = 30000; // 30 segundos

  console.log(
    `Iniciando polling para JobId ${jobId}. Máximo de ${maxAttempts} tentativas com intervalo de ${
      pollingIntervalMs / 1000
    }s.`
  );

  while (status === JobStatus.IN_PROGRESS && attempts < maxAttempts) {
    await new Promise((res) => setTimeout(res, pollingIntervalMs));
    attempts++;

    try {
      const getCommand = new GetDocumentTextDetectionCommand({ JobId: jobId });
      response = await client.send(getCommand);
      status = response.JobStatus;
      console.log(
        `Status Textract (JobId: ${jobId}): ${status}. Tentativa: ${attempts}/${maxAttempts}`
      );
    } catch (pollingError: any) {
      console.error(
        `Erro durante o polling do Textract para JobId ${jobId} (tentativa ${attempts}/${maxAttempts}):`,
        pollingError.message
      );
      // Se um erro de polling ocorrer, podemos optar por continuar tentando até maxAttempts
      // ou falhar imediatamente. Para este exemplo, vamos continuar,
      // mas se o erro for, por exemplo, 'InvalidJobIdException', deveríamos parar.
      // Para uma implementação mais robusta, seria bom verificar o tipo de pollingError.
      // Se for a última tentativa e ainda der erro, o loop vai terminar de qualquer forma.
      if (attempts >= maxAttempts) {
        throw new Error(`Erro no polling do Textract: ${pollingError.message}`);
      }
    }
  }

  if (attempts >= maxAttempts && status === JobStatus.IN_PROGRESS) {
    const timeoutMessage = `Timeout: Job do Textract (${jobId}) não concluído após ${attempts} tentativas (${
      (attempts * pollingIntervalMs) / 1000
    } segundos). Último status: ${status}.`;
    console.error(timeoutMessage);

    throw new Error(timeoutMessage);
  }

  if (status === JobStatus.SUCCEEDED) {
    console.log(`Job do Textract (${jobId}) concluído com sucesso!.`);
    const lines = response.Blocks?.filter(
      (block) => block.BlockType === "LINE"
    ).map((line) => line.Text);

    if (!lines || lines.length === 0) {
      console.warn(
        `Textract retornou sucesso para JobId ${jobId}, mas nenhum texto (LINE) foi extraído.`
      );
      throw new Error(
        `Textract retornou sucesso para JobId ${jobId}, mas nenhum texto (LINE) foi extraído.`
      );
    }

    const documentTextContent = lines ? lines.join("\n") : "";
    console.log(`JobId ${jobId}: Chamando extractDataWithClaudeSonnet.`);

    return documentTextContent;
  } else {
    const finalStatusMessage =
      response?.StatusMessage ||
      (status === JobStatus.FAILED
        ? "Job do Textract falhou."
        : `Status final inesperado: ${status}.`);
    console.error(
      `Falha no processamento do Textract para JobId ${jobId}. Status final: ${status}. Mensagem: ${finalStatusMessage}`
    );

    throw new Error(
      `Job do Textract (${jobId}) não concluído com sucesso. Status: ${status}. Motivo: ${finalStatusMessage}`
    );
  }
};
