import { ApiError } from "@google/genai";
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from "@nestjs/common";

@Catch(ApiError)
export class GeminiExceptionFilter implements ExceptionFilter {
  private static readonly messages: Record<number, string> = {
    429: "Trop de tentatives, veuillez réessayer dans quelques secondes.",
    503: "Le service est temporairement indisponible, veuillez réessayer dans quelques secondes.",
  };

  catch(exception: ApiError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    const status = exception.status || HttpStatus.INTERNAL_SERVER_ERROR;

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      message:
        GeminiExceptionFilter.messages[status] ??
        "Une erreur inconnue est survenue.",
      error: exception.name || "ApiError",
    });
  }
}
