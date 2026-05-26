import { Body, Controller, Get, Post, Res } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";
import type { Response } from "express";
import { aiCheckResults, aiGlobalScore, aiRecommendations } from "../mocks/data-extra";
import { AiService } from "./ai.service";
import { ClaudeService } from "./claude.service";

class AskDto {
  @IsOptional() @IsString() @MaxLength(4000)
  question?: string;
}

@ApiTags("ai")
@Controller("ai")
export class AiController {
  constructor(
    private readonly ai: AiService,
    private readonly claude: ClaudeService,
  ) {}

  @Get("checks")
  checks() {
    return {
      results: aiCheckResults,
      score: aiGlobalScore,
      recommendations: aiRecommendations,
      engine: this.claude.isAvailable() ? "claude-sonnet-4-6" : "heuristic-v1",
    };
  }

  @Post("ask")
  async ask(@Body() body: AskDto) {
    const q = (body?.question ?? "").toString();
    if (q.toLowerCase().includes("/summary") || q.toLowerCase().includes("résum")) {
      return this.ai.summary();
    }
    // Sprint 3: prefer Claude when available, fallback to heuristic
    if (this.claude.isAvailable()) {
      try {
        const text = await this.claude.ask(q);
        return { reply: text, engine: "claude-sonnet-4-6" };
      } catch (e) {
        const err = e instanceof Error ? e.message : "unknown";
        const fallback = this.ai.ask(q);
        return { ...fallback, engine: "heuristic-v1", claudeError: err };
      }
    }
    return { ...this.ai.ask(q), engine: "heuristic-v1" };
  }

  @Post("ask/stream")
  async askStream(@Body() body: AskDto, @Res() res: Response) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const q = (body?.question ?? "").toString();
    try {
      const stream = this.claude.isAvailable() ? this.claude.askStream(q) : this.ai.askStream(q);
      for await (const chunk of stream) {
        res.write(`event: chunk\ndata: ${JSON.stringify({ text: chunk })}\n\n`);
      }
      res.write(`event: done\ndata: {}\n\n`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "stream error";
      res.write(`event: error\ndata: ${JSON.stringify({ message })}\n\n`);
    } finally {
      res.end();
    }
  }
}
