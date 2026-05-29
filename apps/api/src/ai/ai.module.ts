import { Module } from "@nestjs/common";
import { AiController } from "./ai.controller";
import { AiService } from "./ai.service";
import { ClaudeService } from "./claude.service";
import { EmbeddingService } from "./embedding.service";
import { GroqService } from "./groq.service";

@Module({
  controllers: [AiController],
  providers: [AiService, ClaudeService, GroqService, EmbeddingService],
  exports: [AiService, ClaudeService, GroqService, EmbeddingService],
})
export class AiModule {}
