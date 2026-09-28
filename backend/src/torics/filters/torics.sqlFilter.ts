import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from "@nestjs/common";
import { Response } from "express";
import { QueryFailedError } from "typeorm";

@Catch(QueryFailedError)
export class SqliteErrorFilter implements ExceptionFilter {
  catch(
    exception: QueryFailedError & { driverError?: any },
    host: ArgumentsHost,
  ) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const driverError = exception.driverError;
    const sqliteCode: string = driverError?.code || "";

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "Erreur interne de la base de données";

    if (sqliteCode) {
      if (sqliteCode.includes("SQLITE_CONSTRAINT")) {
        status = HttpStatus.CONFLICT;
        message = this.cleanConstraintMessage(
          driverError?.message || exception.message,
        );
      } else if (
        sqliteCode.includes("SQLITE_BUSY") ||
        sqliteCode === "SQLITE_LOCKED"
      ) {
        status = HttpStatus.SERVICE_UNAVAILABLE;
        message =
          "La base de données est actuellement occupée ou verrouillée. Veuillez réessayer.";
      }
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      message,
      error: sqliteCode || "QueryFailedError",
    });
  }

  private cleanConstraintMessage(rawMessage: string): string {
    const msg = rawMessage.toLowerCase();

    if (msg.includes("unique")) {
      return "Un enregistrement avec cette valeur unique existe déjà.";
    }
    if (msg.includes("foreign key")) {
      return "Échec de la contrainte de relation ; l'enregistrement référencé est introuvable.";
    }
    if (msg.includes("not null")) {
      return "Champ obligatoire manquant dans la base de données.";
    }

    return "Une contrainte de données s'est produite lors de l'enregistrement.";
  }
}
