import { formatJSONResponse } from "../../libs/api-gateway";

import {
  summarizeDocument,
  SummarizeDocumentProps,
} from "../../shared/summarize-document";

const handler = async (event: SummarizeDocumentProps) => {
  const extraction = await summarizeDocument(event);
  return formatJSONResponse(201, JSON.stringify(extraction));
};

export const main = handler;
