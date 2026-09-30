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
import { Batch, BatchStatus } from "./entities/batch.entity";
import { createClientDto } from "./dto/createClient.dto";
import { Client } from "./entities/client.entity";
import { SettingOptions, Settings } from "./entities/settings.entity";
import { UpdateSettingsDto } from "./dto/updateSettings.dto";
import { LensBrand } from "./entities/brand.entity";
import { UpdateToricDto } from "./dto/updateToric.dto";

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
    @InjectRepository(LensBrand)
    private readonly brandRepo: Repository<LensBrand>,
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

    await this.brandRepo
      .createQueryBuilder()
      .insert()
      .into(LensBrand)
      .values(
        [
          "Soleko",
          "Cornelia",
          "Versa View",
          "Coopervision",
          "Menicon",
          "Tslac",
          "Air Optix",
        ].map((name) => ({ name })),
      )
      .orIgnore()
      .execute();
  }

  async updateLens(id: string, payload: UpdateToricDto) {
    const lens = await this.LensRepo.findOneBy({ id });
    if (!lens) throw new BadRequestException("Lentille pas trouvée");

    if (payload.note !== undefined) {
      lens.note = payload.note;
    }
    if (payload.left_eye) {
      lens.left_eye = {
        ...lens.left_eye,
        ...payload.left_eye,
      };
    }
    if (payload.right_eye) {
      lens.right_eye = {
        ...lens.right_eye,
        ...payload.right_eye,
      };
    }

    return await this.LensRepo.save(lens);
  }

  async deleteLens(id: string) {
    const result = await this.LensRepo.delete(id);

    if (result.affected === 0) {
      throw new BadRequestException("Lentille pas trouvée");
    }

    return result;
  }

  async getBatches(brand: string) {
    return this.batchRepo
      .createQueryBuilder("batch")
      .innerJoin("batch.brand", "brand")
      .where("brand.name = :brandName", { brandName: brand })
      .addSelect(
        `CASE WHEN batch.status = :draft THEN 0 ELSE 1 END`,
        "status_order",
      )
      .setParameter("draft", BatchStatus.DRAFT)
      .orderBy("status_order", "ASC")
      .addOrderBy("batch.created_at", "DESC")
      .getMany();
  }

  async getBatchContent(id: string) {
    const batch = await this.batchRepo.findOne({
      where: {
        id,
      },
      relations: { brand: true, lens_orders: { client: true } },
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

    let draftBatch = await this.batchRepo.findOne({
      where: {
        brand: { name: payload.brand },
        status: BatchStatus.DRAFT,
      },
    });

    if (!draftBatch) {
      draftBatch = await this.batchRepo.save(
        this.batchRepo.create({
          brand: { name: payload.brand },
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

  getBrands() {
    return this.brandRepo.find();
  }

  async createBrand(name: string) {
    const exists = await this.brandRepo.findOneBy({ name });
    if (exists) throw new BadRequestException("Brand already exists");

    return this.brandRepo.save(
      this.brandRepo.create({
        name,
      }),
    );
  }

  formatDate(value: Date | string): string {
    const d = value instanceof Date ? value : new Date(value);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }

  async excelExport(id: string, customCode?: number) {
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
      const currentYear = new Date().getFullYear();

      const result = await this.batchRepo
        .createQueryBuilder("batch")
        .select("MAX(batch.code)", "maxCode")
        .innerJoin("batch.brand", "brand")
        .where("brand.name = :brandName", { brandName: batch.brand.name })
        .andWhere("strftime('%Y', batch.created_at) = :currentYear", {
          currentYear: String(currentYear),
        })
        .getRawOne<{ maxCode: number | null }>();

      const maxCode = result?.maxCode ?? 0;

      let finalCode: number;

      if (customCode !== undefined) {
        if (customCode <= maxCode) {
          throw new BadRequestException(
            `Le code ${customCode} n'est pas valide. Il doit être supérieur au code maximum actuel (${maxCode}) pour cette année.`,
          );
        }
        finalCode = customCode;
      } else {
        finalCode = maxCode + 1;
      }

      batch.code = finalCode;
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
      const clientName = toric.client?.name ?? "";

      if (toric.left_eye) {
        const leftRow: Record<string, unknown> = {
          note: toric.note ?? "",
          sph: toric.left_eye.sphere,
          cyl: toric.left_eye.cyl ?? null,
          axe: toric.left_eye.axe ?? null,
          ro: toric.left_eye.ro,
          dia: toric.left_eye.dia,
        };
        if (showDate) leftRow.date = date;
        if (showClient) leftRow.clientName = clientName;
        sheet.addRow(leftRow);
      }

      if (toric.right_eye) {
        const rightRow: Record<string, unknown> = {
          note: toric.note ?? "",
          sph: toric.right_eye.sphere,
          cyl: toric.right_eye.cyl ?? null,
          axe: toric.right_eye.axe ?? null,
          ro: toric.right_eye.ro,
          dia: toric.right_eye.dia,
        };
        if (showDate) rightRow.date = date;
        if (showClient) rightRow.clientName = clientName;
        sheet.addRow(rightRow);
      }

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

  async checkArrived(id: string, updatedIds: string[]) {
    if (!updatedIds || updatedIds.length === 0)
      throw new BadRequestException("nothing to change");

    //give sweet date
    for (const updateId of updatedIds) {
      await this.LensRepo.update({ id: updateId }, { arrived_at: new Date() });
    }
    //updates the batch state
    return await this.batchRepo.update(
      { id: id },
      { status: BatchStatus.RECEIVED },
    );
  }

  async deleteBatch(id: string) {
    const batch = await this.batchRepo.findOneBy({ id });
    if (!batch) {
      throw new NotFoundException(`Batch with ID ${id} not found`);
    }

    if (batch.status !== BatchStatus.DRAFT) {
      throw new BadRequestException(
        "Cannot delete a batch that has already been sent/exported.",
      );
    }

    await this.batchRepo.delete(id);
    return { message: "Draft batch successfully deleted" };
  }
}
