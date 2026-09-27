import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const dbConfig = (config: ConfigService): TypeOrmModuleOptions => ({
  type: 'better-sqlite3',
  database: config.get<string>('DB_PATH', 'lms.db'),
  autoLoadEntities: true,
  synchronize: true,
});
