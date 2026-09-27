import {
  Inject,
  Injectable,
  HttpException,
  HttpStatus,
  ServiceUnavailableException,
} from "@nestjs/common";
import { LLM_MODEL_TOKEN, type LLMModel } from "src/llm/models/llm.interface";
import { ResponseSchema } from "src/schemas/lens.schema";

@Injectable()
export class LLMParserService {
  constructor(@Inject(LLM_MODEL_TOKEN) private readonly ai: LLMModel) {}

  async parsePrescriptionImage(
    base64: string,
    mimeType: string,
  ): Promise<ResponseSchema> {
    if (!this.ai)
      throw new ServiceUnavailableException(
        "Automatic Scanning is not available, please write manually",
      );
    return this.retryWithBackoff(
      () => this.ai.parsePrescriptionImage(base64, mimeType),
      3,
      2000,
    );
  }

  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000,
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        const status =
          error?.status || error?.response?.status || error?.statusCode;

        const isTransientError = status === 429 || status === 503;
        const isLastAttempt = attempt === maxRetries;

        if (isTransientError && isLastAttempt) {
          throw new HttpException(
            {
              statusCode: HttpStatus.TOO_MANY_REQUESTS,
              message: "Service is temporarily busy. Please try again.",
              error: "Try Again",
            },
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }

        if (!isTransientError) {
          throw error;
        }

        const backoffDelay =
          delayMs * Math.pow(2, attempt - 1) + Math.random() * 200;

        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
      }
    }

    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: "Service is temporarily busy. Please try again.",
        error: "Try Again",
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
