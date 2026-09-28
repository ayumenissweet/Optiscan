import { MulterModuleOptions } from "@nestjs/platform-express";
import { memoryStorage } from "multer";

export const multerConfig: MulterModuleOptions = {
  storage: memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
};
