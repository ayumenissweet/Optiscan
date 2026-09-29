import { ResponseSchema } from "src/schemas/lens.schema";
import { LLMModel } from "./llm.interface";
import { Content, GoogleGenAI, Schema, Type } from "@google/genai";

const prompt =
  "Extract the contact lens prescription from this image. " +
  "Left eye = OG/Gauche/OS, right eye = OD/Droit. " +
  "The power can written as: SPHERE (CYLINDER à AXIS°), " +
  "for example '+4.25 (-1.25 à 25°)' means sphere=4.25, cyl=-1.25, axe=25. " +
  "Whenever a cylinder is present, the axis is always present too, so you must extract it. " +
  "The word 'à' separates cylinder from axis, and '°' marks the axis in degrees or it can be written A : 25°. " +
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
  description: "Cylinder, the first number inside the parentheses (e.g. -1.25)",
},
axe: {
  type: Type.NUMBER,
  nullable: true,
  description:
    "Axis in degrees, the number after 'à' inside the parentheses, 0-180 (e.g. 25°). Never null if cyl is present.",
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
