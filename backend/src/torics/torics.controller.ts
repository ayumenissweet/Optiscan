import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UseInterceptors,
} from "@nestjs/common";
import type { Response } from "express";
import { CreateToricDto } from "./dto/createToric.dto";
import { ToricsService } from "./torics.service";
import { Batch } from "./entities/batch.entity";
import { createClientDto } from "./dto/createClient.dto";
import { UpdateSettingsDto } from "./dto/updateSettings.dto";
import { UpdateToricDto } from "./dto/updateToric.dto";
import { multerConfig } from "src/config/multerConfig";
import { FileInterceptor } from "@nestjs/platform-express";

@Controller("api")
export class ToricsController {
  constructor(private readonly toricService: ToricsService) {}

  // ========= LENS HANDLING ========

  @Patch("lenses/:id")
  updateLens(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: UpdateToricDto,
  ) {
    return this.toricService.updateLens(id, body);
  }

  @Delete("lenses/:id")
  deleteLens(@Param("id", ParseUUIDPipe) id: string) {
    return this.toricService.deleteLens(id);
  }

  // ========== BATCH HANDLING =========

  //pull batches WITHOUT lens orders
  @Get("batches")
  getBatches(@Query("brand") brand: string): Promise<Batch[]> {
    return this.toricService.getBatches(brand);
  }

  //pull the batch WITH lens orders and client
  @Get("batches/:id")
  getBatchContent(@Param("id", ParseUUIDPipe) id: string) {
    return this.toricService.getBatchContent(id);
  }

  // create a new entry
  @Post("create")
  @UseInterceptors(FileInterceptor('image', multerConfig))
  createProduct(@Body() body: CreateToricDto) {
    return this.toricService.create(body);
  }

  // ======= SETTINGS ===========
  @Get("settings")
  getSettings() {
    return this.toricService.getSettings();
  }

  @Patch("settings")
  editSettings(@Body() body: UpdateSettingsDto) {
    return this.toricService.updateSettings(body);
  }

  // ========== CLIENTS ==========

  @Get("clients")
  getClients() {
    return this.toricService.getClients();
  }

  @Post("clients")
  createClient(@Body() body: createClientDto) {
    return this.toricService.createClient(body);
  }

  //export into excel
  @Post("export/:id")
  @Header(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  )
  async excelExport(
    @Param("id", ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
    @Body("customCode") customCode?: number,
  ) {
    const { buffer, code } = await this.toricService.excelExport(
      id,
      customCode,
    );

    res.header("X-Batch-Code", String(code));

    return new StreamableFile(buffer);
  }

  // ======== BRAND IMPLEMENTATION =========
  @Get("brand")
  getBrands() {
    return this.toricService.getBrands();
  }

  @Patch("brand")
  createBrand(@Body("brand") brand: string) {
    if (!brand) return;
    return this.toricService.createBrand(brand);
  }

  // ======== NOT IMPLEMENTED IN FRONTEND ========

  //TODO
  @Patch(":id/arrived")
  checkArrived(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() updatedIds: string[],
  ) {
    return this.toricService.checkArrived(id, updatedIds);
  }

  @Delete(":id")
  deleteProduct(@Param("id", ParseUUIDPipe) id: string) {
    return this.toricService.deleteBatch(id);
  }
}
