import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { LLM_MODEL_TOKEN } from "./models/llm.interface";
import { GeminiModel } from "./models/llm-gemini.provider";
import { GPTModel } from "./models/llm-gpt.provider";
import { LLMParserService } from "./llmParser.service";

@Module({
  providers: [
    {
      provide: LLM_MODEL_TOKEN,
      useFactory: (configService: ConfigService) => {
        const geminiKey = configService.get<string>("GEMINI_API_KEY");
        if (geminiKey) return new GeminiModel(geminiKey);

        const gptKey = configService.get<string>("GPT_API_KEY");
        if (gptKey) return new GPTModel(gptKey);

        return null;
      },
      inject: [ConfigService],
    },
    LLMParserService,
  ],
  exports: [LLMParserService],
})
export class LlmModule {}
