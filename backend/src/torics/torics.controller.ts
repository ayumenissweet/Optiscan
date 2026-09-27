import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import type { Response } from "express";
import { CreateToricDto } from "./dto/createToric.dto";
import { ToricsService } from "./torics.service";
import { multerConfig } from "src/config/multerConfig";
import { FileInterceptor } from "@nestjs/platform-express";
import { Batch, ToricBrand } from "./entities/batch.entity";
import { createClientDto } from "./dto/createClient.dto";
import { ResponseSchema } from "src/schemas/lens.schema";
import { UpdateSettingsDto } from "./dto/updateSettings.dto";

@Controller("api")
export class ToricsController {
  constructor(private readonly toricService: ToricsService) {}

  @Get("batches")
  getBatches(
    @Query("brand", new ParseEnumPipe(ToricBrand)) brand: ToricBrand,
  ): Promise<Batch[]> {
    return this.toricService.getBatches(brand);
  }

  //pull the batches and their content the batch.lens_orders
  @Get("batches/:id")
  getBatchContent(@Param("id", ParseUUIDPipe) id: string) {
    return this.toricService.getBatchContent(id);
  }

  //scan an image
  @Post("scan")
  @UseInterceptors(FileInterceptor("image", multerConfig))
  scanImage(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ResponseSchema> {
    return this.toricService.scanImage(file);
  }

  // create a new entry
  @Post("create")
  @UseInterceptors(FileInterceptor("image", multerConfig))
  createProduct(@Body() body: CreateToricDto) {
    return this.toricService.create(body);
  }

  @Get("settings")
  getSettings() {
    return this.toricService.getSettings();
  }

  @Patch("settings")
  editSettings(@Body() body: UpdateSettingsDto) {
    return this.toricService.updateSettings(body);
  }

  @Get("clients")
  getClients() {
    return this.toricService.getClients();
  }

  @Post("clients")
  createClient(@Body() body: createClientDto) {
    return this.toricService.createClient(body);
  }

  //export into excel
  @Get("export/:id")
  @Header(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  )
  async excelExport(
    @Param("id", ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { buffer, code } = await this.toricService.excelExport(id);

    res.header("X-Batch-Code", String(code));

    return new StreamableFile(buffer);
  }

  @Patch(":id/arrived")
  checkArrived(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() updatedIds: string[],
  ) {
    return this.toricService.checkArrived(id, updatedIds);
  }

  @Delete(":id")
  deleteProduct(@Param("id", ParseUUIDPipe) id: string) {
    return this.toricService.deleteProduct(id);
  }
}
