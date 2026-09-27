import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dbConfig } from './config/dbConfig';
import { ToricsModule } from './torics/torics.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LlmModule } from './llm/llm.module';

@Module({
  imports: [
    ToricsModule,
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: dbConfig,
    }),
    LlmModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
