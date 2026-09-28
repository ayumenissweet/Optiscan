import { ResponseSchema } from "src/schemas/lens.schema";
import { LLMModel } from "./llm.interface";
import { Content, GoogleGenAI, Schema, Type } from "@google/genai";

const prompt =
  "Extract the contact lens prescription from this image. " +
  "Left eye = OG/Gauche/OS, right eye = OD/Droit. " +
  "Set an eye to null if it isn't prescribed. " +
  'If the image is not a prescription, use status "invalid_document". ' +
  'If it is one but unreadable, use status "parse_failed". ' +
  "In both failure cases, set both eyes to null.";

const eyeSchema: Schema = {
  type: Type.OBJECT,
  nullable: true,
  properties: {
    ro: {
      type: Type.NUMBER,
      nullable: true,
      description: "Rayon / base curve (e.g. 8.60)",
    },
    dia: {
      type: Type.NUMBER,
      nullable: true,
      description: "Diamètre in mm (e.g. 14.00)",
    },
    sphere: {
      type: Type.NUMBER,
      description: "Puissance / sphère (e.g. -8.50)",
    },
    cyl: {
      type: Type.NUMBER,
      nullable: true,
      description: "Cylindre, (e.g. -0.75)",
    },
    axe: {
      type: Type.NUMBER,
      nullable: true,
      description: "Axis in degrees (e.g. 110)",
    },
  },
  required: ["sphere"],
};

export const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    status: {
      type: Type.STRING,
      enum: ["ok", "invalid_document", "parse_failed"],
    },
    left_eye: eyeSchema,
    right_eye: eyeSchema,
  },
  required: ["status", "left_eye", "right_eye"],
};

export class GeminiModel implements LLMModel {
  private readonly ai: GoogleGenAI;
  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async parsePrescriptionImage(
    base64: string,
    mimeType: string,
  ): Promise<ResponseSchema> {
    const contents: Content[] = [
      {
        parts: [
          { inlineData: { mimeType, data: base64 } },
          {
            text: prompt,
          },
        ],
      },
    ];

    const response = await this.ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents,
      config: {
        responseMimeType: "application/json",
        responseSchema,
      },
    });

    if (!response.text) throw new Error(`Error Parsing ${response}`);
    return JSON.parse(response.text);
  }
}
