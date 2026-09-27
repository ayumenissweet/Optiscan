import { Module, ValidationPipe } from "@nestjs/common";
import { ToricsController } from "./torics.controller";
import { ToricsService } from "./torics.service";
import { APP_PIPE } from "@nestjs/core";
import { TypeOrmModule } from "@nestjs/typeorm";
import { LensOrder } from "./entities/order.entity";
import { ImageCompresserService } from "./imageCompresser.service";
import { LlmModule } from "src/llm/llm.module";
import { Batch } from "./entities/batch.entity";
import { Client } from "./entities/client.entity";
import { Settings } from "./entities/settings.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([LensOrder, Batch, Client, Settings]),
    LlmModule,
  ],
  controllers: [ToricsController],
  providers: [
    ToricsService,
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        transform: true,
        forbidNonWhitelisted: true,
        stopAtFirstError: true,
      }),
    },
    ImageCompresserService,
  ],
})
export class ToricsModule {}
