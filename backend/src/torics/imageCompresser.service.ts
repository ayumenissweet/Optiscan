import { Injectable } from "@nestjs/common";
import sharp from "sharp";

@Injectable()
export class ImageCompresserService {
  async compressBase64(buffer: Buffer) {
    const compressedBuffer = await sharp(buffer)
      .resize({
        width: 1600,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 80 })
      .toBuffer();

    return {
      base64: compressedBuffer.toString("base64"),
      mimeType: "image/jpeg",
    };
  }
}
