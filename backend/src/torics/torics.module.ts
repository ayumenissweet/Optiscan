import { Module, ValidationPipe } from "@nestjs/common";
import { ToricsController } from "./torics.controller";
import { ToricsService } from "./torics.service";
import { APP_FILTER, APP_PIPE } from "@nestjs/core";
import { TypeOrmModule } from "@nestjs/typeorm";
import { LensOrder } from "./entities/order.entity";
import { Batch } from "./entities/batch.entity";
import { Client } from "./entities/client.entity";
import { Settings } from "./entities/settings.entity";
import { SqliteErrorFilter } from "./filters/torics.sqlFilter";
import { LensBrand } from "./entities/brand.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([LensOrder, Batch, Client, Settings, LensBrand]),
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
    {
      provide: APP_FILTER,
      useClass: SqliteErrorFilter,
    },
  ],
})
export class ToricsModule {}
