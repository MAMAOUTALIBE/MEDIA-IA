import { Controller, Get } from "@nestjs/common";
import { aiCheckResults, aiGlobalScore, aiRecommendations } from "../mocks/data-extra";

@Controller("ai")
export class AiController {
  @Get("checks")
  checks() {
    return {
      results: aiCheckResults,
      score: aiGlobalScore,
      recommendations: aiRecommendations,
    };
  }
}
