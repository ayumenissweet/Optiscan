import { ResponseSchema } from 'src/schemas/lens.schema';
import { LLMModel } from './llm.interface';
import { Content, GoogleGenAI, Schema, Type } from '@google/genai';

const eyeSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    ro: {
      type: Type.NUMBER,
      nullable: true,
      description: 'Rayon / Base Curve (e.g., 8.60). Null if not present.',
    },
    dia: {
      type: Type.NUMBER,
      nullable: true,
      description: 'Diamètre in mm (e.g., 14.00). Null if not present.',
    },
    sphere: {
      type: Type.NUMBER,
      description: 'Puissance / Sphère power (e.g., -8.50, +2.75, -14.00).',
    },
    cyl: {
      type: Type.NUMBER,
      nullable: true,
      description:
        'Cylindre power inside parentheses e.g. (-0.75). Null if spherical.',
    },
    axe: {
      type: Type.NUMBER,
      nullable: true,
      description:
        'Axis angle in degrees following cylinder e.g. 110 or 15. Null if spherical.',
    },
  },
  required: ['sphere'],
};
const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    status: {
      type: Type.STRING,
      enum: ['ok', 'invalid_document', 'parse_failed'],
    },
    left_eye: { ...eyeSchema, nullable: true },
    right_eye: { ...eyeSchema, nullable: true },
  },
  required: ['status', 'left_eye', 'right_eye'],
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
            text:
              'This image should be a toric contact lens prescription. ' +
              'Extract the values for left eye (OG/left/gauche) and right eye (OD/right/droit). ' +
              "If the image is not a prescription, set status to 'invalid_document'. " +
              "If it is a prescription but you cannot confidently read the values, set status to 'parse_failed'.",
          },
        ],
      },
    ];

    const response = await this.ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents,
      config: {
        responseMimeType: 'application/json',
        responseSchema,
      },
    });

    if (!response.text) throw new Error(`Error Parsing ${response}`);
    return JSON.parse(response.text);
  }
}
