import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import * as fs from "fs";

export async function bootstrap(port: number) {
  const dbPath = process.env.DB_PATH!;
  if (fs.existsSync(dbPath)) fs.copyFileSync(dbPath, `${dbPath}.bak-v1`);
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || origin === "null" || origin === "http://localhost:5173") {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  });
  const server = await app.listen(port, "127.0.0.1");
  const address = server.address();
  const actualPort = typeof address === "string" ? port : address.port;

  return { app, port: actualPort };
}
