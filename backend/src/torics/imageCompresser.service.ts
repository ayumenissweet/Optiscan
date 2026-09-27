import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import sharp from 'sharp'

@Injectable()
export class ImageCompresserService {
  async compressAndSave(file: Express.Multer.File) {
    const uploadPath = join(process.cwd(), 'uploads');
    if (!existsSync(uploadPath)) {
      mkdirSync(uploadPath, { recursive: true });
    }

    const dateStr = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
    const hash = randomBytes(4).toString('hex');

    const filename = `${dateStr}-${hash}.jpg`;

    await sharp(file.buffer)
      .resize({
        width: 1600,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 80 })
      .toFile(join(uploadPath, filename));

    return `uploads/${filename}`;
  }

  async compressBase64(buffer: Buffer) {
    const compressedBuffer = await sharp(buffer)
      .resize({
        width: 1600,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 80 })
      .toBuffer();

    return {
      base64: compressedBuffer.toString('base64'),
      mimeType: 'image/jpeg',
    };
  }
}
