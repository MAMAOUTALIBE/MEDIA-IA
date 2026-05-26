import { Body, Controller, Get, Post, Res } from "@nestjs/common";
import type { Response } from "express";
import { aiCheckResults, aiGlobalScore, aiRecommendations } from "../mocks/data-extra";
import { AiService } from "./ai.service";

interface AskBody {
  question?: string;
}

@Controller("ai")
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Get("checks")
  checks() {
    return {
      results: aiCheckResults,
      score: aiGlobalScore,
      recommendations: aiRecommendations,
    };
  }

  @Post("ask")
  ask(@Body() body: AskBody) {
    const q = (body?.question ?? "").toString();
    if (q.toLowerCase().includes("/summary") || q.toLowerCase().includes("résum")) {
      return this.ai.summary();
    }
    return this.ai.ask(q);
  }

  /**
   * Server-Sent Events streaming. Le client reçoit :
   *   - event "chunk" : { text } pour chaque mot/segment
   *   - event "done"  : {} quand la réponse est complète
   *   - event "error" : { message } si une erreur survient
   */
  @Post("ask/stream")
  async askStream(@Body() body: AskBody, @Res() res: Response) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const q = (body?.question ?? "").toString();
    try {
      for await (const chunk of this.ai.askStream(q)) {
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
