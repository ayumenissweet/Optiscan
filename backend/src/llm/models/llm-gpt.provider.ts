import { ResponseSchema } from 'src/schemas/lens.schema';
import { LLMModel } from './llm.interface';

export class GPTModel implements LLMModel {
  constructor(apiKey: string) {}

  async parsePrescriptionImage(
    base64: string,
    mimeType: string,
  ): Promise<ResponseSchema> {
    return { status: 'parse_failed' };
  }
}
