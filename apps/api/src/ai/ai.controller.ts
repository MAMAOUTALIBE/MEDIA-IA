import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  Res,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ArrayMinSize,
  ArrayMaxSize,
} from "class-validator";
import type { Response } from "express";
import { Roles } from "../auth/roles.decorator";
import { aiCheckResults, aiGlobalScore, aiRecommendations } from "../mocks/data-extra";
import { PrismaService } from "../prisma/prisma.service";
import { AiService } from "./ai.service";
import { ClaudeService } from "./claude.service";
import { GroqService } from "./groq.service";

class AskDto {
  @IsOptional() @IsString() @MaxLength(4000)
  question?: string;
}

class GenerateTitlesDto {
  @IsOptional() @IsString() contentId?: string;
  @IsOptional() @IsString() @MinLength(50) @MaxLength(50_000) body?: string;
  @IsOptional() @IsString() @MaxLength(200) currentTitle?: string;
}

class FactCheckDto {
  @IsOptional() @IsString() contentId?: string;
  @IsOptional() @IsString() @MinLength(50) @MaxLength(50_000) body?: string;
}

const SOCIAL_PLATFORMS = ["twitter", "instagram", "tiktok", "facebook", "telegram"] as const;
type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

class SocialPostsDto {
  @IsOptional() @IsString() contentId?: string;
  @IsOptional() @IsString() @MaxLength(200) title?: string;
  @IsOptional() @IsString() @MinLength(50) @MaxLength(50_000) body?: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @IsIn(SOCIAL_PLATFORMS as unknown as string[], { each: true })
  platforms!: SocialPlatform[];
}

// Cost shield: LLM endpoints are expensive — cap per-IP RPM lower than the
// default 100/min bucket. The named "ai" bucket is defined in AppModule.
@ApiTags("ai")
@Throttle({ ai: { limit: 30, ttl: 60_000 } })
@Controller("ai")
export class AiController {
  constructor(
    private readonly ai: AiService,
    private readonly claude: ClaudeService,
    private readonly groq: GroqService,
    private readonly prisma: PrismaService,
  ) {}

  // ---------------------------------------------------------------------------
  // Sprint IA-Générative — endpoints assistant éditorial (Groq Llama 3.3 70B)
  // ---------------------------------------------------------------------------

  /**
   * Soit on passe `body` directement (preview en édition), soit on passe
   * `contentId` et on rapatrie le draft depuis la DB.
   */
  private async resolveBody(
    contentId: string | undefined,
    body: string | undefined,
  ): Promise<{ body: string; title?: string }> {
    if (body && body.trim().length >= 50) return { body };
    if (!contentId) {
      throw new BadRequestException("Fournir `contentId` OU `body` (≥ 50 chars)");
    }
    const c = await this.prisma.content.findUnique({
      where: { id: contentId },
      select: { id: true, title: true, body: true, deletedAt: true },
    });
    if (!c || c.deletedAt) throw new NotFoundException(`Content ${contentId} not found`);
    if (!c.body || c.body.length < 50) {
      throw new BadRequestException(`Body trop court pour analyser (≥ 50 chars requis)`);
    }
    return { body: c.body, title: c.title };
  }

  @Roles("journalist")
  @Post("generate-titles")
  @ApiOperation({ summary: "Génère 5 titres alternatifs FR via Groq Llama 3.3 70B" })
  async generateTitles(@Body() dto: GenerateTitlesDto) {
    const { body, title } = await this.resolveBody(dto.contentId, dto.body);
    const titles = await this.groq.generateTitles(body, dto.currentTitle ?? title);
    return { titles, engine: "groq:llama-3.3-70b-versatile" };
  }

  @Roles("journalist")
  @Post("fact-check")
  @ApiOperation({
    summary:
      "Fact-check léger d'un brouillon : flags + sources à vérifier. NE remplace PAS un fact-checking humain.",
  })
  async factCheck(@Body() dto: FactCheckDto) {
    const { body } = await this.resolveBody(dto.contentId, dto.body);
    const result = await this.groq.factCheck(body);
    return { ...result, engine: "groq:llama-3.3-70b-versatile" };
  }

  @Roles("journalist")
  @Post("social-posts")
  @ApiOperation({
    summary: "Génère des posts sociaux adaptés par plateforme (twitter, instagram, tiktok, facebook, telegram)",
  })
  async socialPosts(@Body() dto: SocialPostsDto) {
    const { body, title } = await this.resolveBody(dto.contentId, dto.body);
    const finalTitle = dto.title ?? title ?? "";
    const posts = await this.groq.socialPosts(finalTitle, body, dto.platforms);
    return { posts, engine: "groq:llama-3.3-70b-versatile" };
  }

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
