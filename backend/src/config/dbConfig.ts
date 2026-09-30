import { ConfigService } from "@nestjs/config";
import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import { BrandEntity1730000000000 } from "src/migrations/1730000000000-BrandEntity";

export const dbConfig = (config: ConfigService): TypeOrmModuleOptions => ({
  type: "better-sqlite3",
  database: config.get<string>("DB_PATH", "lms.db"),
  autoLoadEntities: true,
  synchronize: true,
  migrations: [BrandEntity1730000000000],
  migrationsRun: true,
});
