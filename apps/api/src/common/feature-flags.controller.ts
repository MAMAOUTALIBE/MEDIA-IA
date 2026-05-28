import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "../auth/public.decorator";
import { FeatureFlagsService } from "./feature-flags.service";

@ApiTags("flags")
@Controller("flags")
export class FeatureFlagsController {
  constructor(private readonly flags: FeatureFlagsService) {}

  /**
   * Snapshot of all feature flags. Exposed unauthenticated because the values
   * are coarse capability switches the front-end must read at boot to decide
   * which UI affordances to render. No PII, no business data.
   *
   * Auth engineers reviewing this: each flag controls *whether a code path
   * ships*, not who can see what. RBAC still gates the underlying actions.
   */
  @Public()
  @Get()
  @ApiOperation({ summary: "Snapshot of all feature flags (front-end capability discovery)" })
  list() {
    return { flags: this.flags.snapshot(), at: new Date().toISOString() };
  }
}
