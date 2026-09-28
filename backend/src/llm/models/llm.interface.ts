import { ResponseSchema } from "src/schemas/lens.schema";

//CURRENTLY, the only functions needed from an LLM
export interface LLMModel {
  parsePrescriptionImage(
    base64: string,
    mimeType: string,
  ): Promise<ResponseSchema>;
}

export const LLM_MODEL_TOKEN = Symbol("LLM_MODEL_TOKEN");
