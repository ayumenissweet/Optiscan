import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Request, Response } from "express";

@Catch() // Empty @Catch() decorator captures ALL exceptions
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // --- CONSOLE LOG EVERYTHING HERE ---
    console.log("=============== ERROR DETECTED ===============");
    console.log(
      `[${new Date().toISOString()}] ${request.method} ${request.url}`,
    );
    console.error("Exception Details:", exception);
    console.log("==============================================");

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message:
        exception instanceof HttpException
          ? exception.getResponse()
          : "Internal Server Error",
    });
  }
}
