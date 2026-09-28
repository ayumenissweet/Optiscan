import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { LensOrder } from "./entities/order.entity";
import { In, Repository } from "typeorm";
import { CreateToricDto } from "./dto/createToric.dto";
import { ImageCompresserService } from "./imageCompresser.service";
import { LLMParserService } from "src/llm/llmParser.service";
import * as ExcelJS from "exceljs";
import { Batch, BatchStatus, ToricBrand } from "./entities/batch.entity";
import { createClientDto } from "./dto/createClient.dto";
import { Client } from "./entities/client.entity";
import { SettingOptions, Settings } from "./entities/settings.entity";
import { UpdateSettingsDto } from "./dto/updateSettings.dto";

@Injectable()
export class ToricsService {
  constructor(
    @InjectRepository(LensOrder)
    private readonly LensRepo: Repository<LensOrder>,
    @InjectRepository(Batch)
    private readonly batchRepo: Repository<Batch>,
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
    @InjectRepository(Settings)
    private readonly settingsRepo: Repository<Settings>,
    private readonly imageCompressService: ImageCompresserService,
    private readonly llmParsingService: LLMParserService,
  ) {}

  async onModuleInit() {
    const defaults = [
      { key: SettingOptions.CLIENT, value: true },
      { key: SettingOptions.DATE, value: true },
    ];

    for (const def of defaults) {
      const exists = await this.settingsRepo.findOne({
        where: { key: def.key },
      });
      if (!exists) {
        await this.settingsRepo.save(this.settingsRepo.create(def));
      }
    }
  }

  async getBatches(brand: ToricBrand) {
    return this.batchRepo.find({ where: { brand } });
  }

  async getBatchContent(id: string) {
    const batch = await this.batchRepo.findOne({
      where: {
        id,
      },
      relations: { lens_orders: { client: true } },
    });

    if (!batch) throw new NotFoundException("Batch Not Found");
    return batch;
  }

  async scanImage(file: Express.Multer.File) {
    const { base64, mimeType } = await this.imageCompressService.compressBase64(
      file.buffer,
    );
    return this.llmParsingService.parsePrescriptionImage(base64, mimeType);
  }

  async create(payload: CreateToricDto) {
    const client = await this.clientRepo.findOneBy({ id: payload.clientId });
    if (!client) {
      throw new BadRequestException("Client not found");
    }

    if (!payload.left_eye && !payload.right_eye)
      throw new BadRequestException(
        "Au moins une ordonnance pour les yeux est requise.",
      );

    let draftBatch = await this.batchRepo.findOneBy({
      brand: payload.brand,
      status: BatchStatus.DRAFT,
    });

    if (!draftBatch) {
      draftBatch = await this.batchRepo.save(
        this.batchRepo.create({
          brand: payload.brand,
          status: BatchStatus.DRAFT,
          created_at: new Date(),
        }),
      );
    }

    return this.LensRepo.save({
      client: client,
      note: payload.note,
      left_eye: payload.left_eye,
      right_eye: payload.right_eye,
      batch: { id: draftBatch.id },
    });
  }

  async getSettings() {
    return this.settingsRepo.find({});
  }

  async updateSettings(payload: UpdateSettingsDto) {
    const settingsData = payload.data;
    const updatedSettings: Settings[] = [];

    for (const key in settingsData) {
      if (Object.prototype.hasOwnProperty.call(settingsData, key)) {
        const value = settingsData[key as keyof SettingOptions];

        if (value === undefined) {
          continue;
        }

        let setting = await this.settingsRepo.findOne({
          where: { key: key as SettingOptions },
        });

        if (setting) {
          setting.value = value;
        } else {
          setting = this.settingsRepo.create({
            key: key as SettingOptions,
            value: value,
          });
        }

        const saved = await this.settingsRepo.save(setting);
        updatedSettings.push(saved);
      }
    }

    return updatedSettings;
  }

  getClients() {
    return this.clientRepo.find();
  }

  createClient(body: createClientDto) {
    return this.clientRepo.save(
      this.clientRepo.create({
        name: body.name,
        phone_number: body.phone_number ?? undefined,
      }),
    );
  }

  async checkArrived(id: string, updatedIds: string[]) {
    if (!updatedIds || updatedIds.length === 0)
      throw new BadRequestException("nothing to change");

    //give sweet date
    for (const updateId in updatedIds) {
      await this.LensRepo.update(
        { id: updateId },
        {
          arrived_at: new Date(),
        },
      );
    }
    //updates the batch state
    return await this.batchRepo.update(
      { id: id },
      { status: BatchStatus.RECEIVED },
    );
  }

  async deleteProduct(id: string) {
    const lens = await this.LensRepo.findOneBy({ id });
    if (!lens)
      throw new NotFoundException(
        `The toric lens with the id ${id} is not found`,
      );

    await this.LensRepo.delete(id);
    return "Successfully deleted";
  }

  formatDate(value: Date | string): string {
    const d = value instanceof Date ? value : new Date(value);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }

  async excelExport(id: string) {
    const batch = await this.batchRepo.findOne({
      where: { id },
      relations: {
        lens_orders: {
          client: true,
        },
      },
    });

    if (!batch) throw new NotFoundException(`Batch not created / not found`);

    if (!batch.lens_orders || batch.lens_orders.length === 0)
      throw new BadRequestException("This batch has no torics to export");

    if (batch.status === BatchStatus.DRAFT) {
      const result = await this.batchRepo
        .createQueryBuilder("batch")
        .select("MAX(batch.code)", "maxCode")
        .where("batch.brand = :brand", {
          brand: batch.brand,
        })
        .getRawOne<{ maxCode: number | null }>();

      const newOrder: number = (result?.maxCode ?? 0) + 1;

      batch.code = newOrder;
      batch.exported_at = new Date();
      batch.status = BatchStatus.SENT;

      await this.batchRepo.save(batch);
    }

    const settings = await this.settingsRepo.find({
      where: { key: In([SettingOptions.CLIENT, SettingOptions.DATE]) },
    });

    const showClient =
      settings.find((s) => s.key === SettingOptions.CLIENT)?.value ?? true;
    const showDate =
      settings.find((s) => s.key === SettingOptions.DATE)?.value ?? true;

    const torics = batch.lens_orders;
    const date = this.formatDate(batch.created_at);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("LMS Torics");

    // Build columns dynamically based on settings
    const columns: Partial<ExcelJS.Column>[] = [];

    if (showDate) {
      columns.push({ header: "Date", key: "date", width: 14 });
    }
    if (showClient) {
      columns.push({ header: "Client", key: "clientName", width: 25 });
    }

    columns.push(
      { header: "Remarque", key: "note", width: 32 },
      { header: "Sphere", key: "sph", width: 9, style: { numFmt: "0.00" } },
      { header: "Cylindre", key: "cyl", width: 9, style: { numFmt: "0.00" } },
      { header: "Axe", key: "axe", width: 9 },
      { header: "Rayon", key: "ro", width: 9, style: { numFmt: "0.00" } },
      { header: "Diametre", key: "dia", width: 9, style: { numFmt: "0.00" } },
    );

    sheet.columns = columns;

    for (const toric of torics) {
      const clientName = toric.client.name;

      const leftRow: Record<string, unknown> = {
        note: toric.note ?? "",
        sph: toric.left_eye.sphere,
        cyl: toric.left_eye.cyl ?? null,
        axe: toric.left_eye.axe ?? null,
        ro: toric.left_eye.ro,
        dia: toric.left_eye.dia,
      };
      const rightRow: Record<string, unknown> = {
        note: toric.note ?? "",
        sph: toric.right_eye.sphere,
        cyl: toric.right_eye.cyl ?? null,
        axe: toric.right_eye.axe ?? null,
        ro: toric.right_eye.ro,
        dia: toric.right_eye.dia,
      };

      if (showDate) {
        leftRow.date = date;
        rightRow.date = date;
      }
      if (showClient) {
        leftRow.clientName = clientName;
        rightRow.clientName = clientName;
      }

      sheet.addRow(leftRow);
      sheet.addRow(rightRow);
      sheet.addRow({});
    }

    sheet.columns.forEach((column) => {
      column.font = { name: "Calibri", size: 11 };
    });
    sheet.eachRow({ includeEmpty: true }, (row) => {
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.font = { name: "Calibri", size: 11 };
      });
    });
    sheet.getRow(1).font = { name: "Calibri", size: 12, bold: true };
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    return { buffer, code: batch.code };
  }
}
