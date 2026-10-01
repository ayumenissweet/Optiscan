import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { dbConfig } from "./config/dbConfig";
import { ToricsModule } from "./torics/torics.module";
import { ConfigModule, ConfigService } from "@nestjs/config";

@Module({
  imports: [
    ToricsModule,
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: dbConfig,
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
