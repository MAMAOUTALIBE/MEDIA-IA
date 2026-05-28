import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { MfaService } from "./mfa.service";
import { IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from "class-validator";
import { Roles } from "./roles.decorator";
import { LoginDto } from "./dto/login.dto";
import { MfaActivateDto, MfaVerifyDto, RefreshDto } from "./dto/mfa.dto";
import { Public } from "./public.decorator";

class IssueServiceTokenDto {
  // Human-readable label baked into the JWT `sub`/`name` for audit lookup.
  // Limited charset so it can land in URLs/log files without escaping.
  @IsString()
  @Matches(/^[a-zA-Z0-9:_-]+$/, {
    message: "label must match /^[a-zA-Z0-9:_-]+$/",
  })
  @MaxLength(64)
  label!: string;

  @IsOptional()
  @IsInt()
  @Min(60) // ≥ 1 min so it's worth using
  @Max(24 * 60 * 60) // cap at 24h (matches service.issueServiceToken)
  ttlSeconds?: number;
}

const REFRESH_COOKIE = "cmr_rt";
const ACCESS_COOKIE = "cmr_at"; // optional: parallel to Bearer for browser clients

function refreshCookieOpts() {
  const days = Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30);
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/api/auth",
    maxAge: days * 24 * 60 * 60 * 1000,
  };
}

function accessCookieOpts() {
  const secs = Number(process.env.JWT_EXPIRES_IN_SECONDS ?? 60 * 60 * 8);
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: secs * 1000,
  };
}

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly mfa: MfaService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("login")
  @ApiOperation({ summary: "Login (rate-limited 5/min/IP). Returns either {token, refreshToken} or {mfaRequired, mfaChallenge}." })
  async login(
    @Body() body: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = req.ip;
    const ua = req.headers["user-agent"];
    const result = await this.auth.login(body.email, body.password, ip, ua);
    if ("mfaRequired" in result) return result;
    res.cookie(REFRESH_COOKIE, result.refreshToken, refreshCookieOpts());
    res.cookie(ACCESS_COOKIE, result.token, accessCookieOpts());
    return result;
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("mfa/verify")
  @ApiOperation({ summary: "Exchange MFA challenge + TOTP code for JWT (step 2 of login)" })
  async mfaVerifyLogin(
    @Body() body: MfaVerifyDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = req.ip;
    const ua = req.headers["user-agent"];
    const r = await this.auth.mfaVerify(body.mfaChallenge, body.code, ip, ua);
    res.cookie(REFRESH_COOKIE, r.refreshToken, refreshCookieOpts());
    res.cookie(ACCESS_COOKIE, r.token, accessCookieOpts());
    return r;
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post("refresh")
  @ApiOperation({ summary: "Refresh access JWT from refresh-token cookie or body" })
  async refresh(
    @Body() body: RefreshDto | { refreshToken?: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = (body as { refreshToken?: string })?.refreshToken ?? (req.cookies?.[REFRESH_COOKIE] as string | undefined);
    if (!token) throw new UnauthorizedException("Refresh token requis");
    const r = await this.auth.refresh(token);
    res.cookie(ACCESS_COOKIE, r.token, accessCookieOpts());
    return r;
  }

  @Public()
  @Post("logout")
  @ApiOperation({ summary: "Revoke refresh-token + clear cookies" })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    await this.auth.logout(token, req.user?.sub);
    res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOpts(), maxAge: 0 });
    res.clearCookie(ACCESS_COOKIE, { ...accessCookieOpts(), maxAge: 0 });
    return { ok: true };
  }

  @Roles("admin")
  @Post("service-token")
  @ApiOperation({
    summary: "Mint a short-lived JWT for a non-human caller (n8n, GitHub Actions).",
  })
  async mintServiceToken(
    @Body() body: IssueServiceTokenDto,
    @Req() req: Request,
  ) {
    if (!req.user) throw new UnauthorizedException();
    return this.auth.issueServiceToken({
      issuedByUserId: req.user.sub,
      label: body.label,
      ttlSeconds: body.ttlSeconds,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
  }

  @Get("me")
  @ApiOperation({ summary: "Current user from Bearer or cookie token" })
  async me(@Req() req: Request) {
    if (!req.user) throw new UnauthorizedException();
    const user = await this.auth.meFromPayload(req.user);
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      team: user.team,
      initials: user.initials,
      color: user.color,
      mfaEnabled: user.mfaEnabled,
    };
  }

  @Post("mfa/setup")
  @ApiOperation({ summary: "Generate provisional MFA secret + QR code (requires login)" })
  async mfaSetup(@Req() req: Request) {
    if (!req.user) throw new UnauthorizedException();
    return this.mfa.setup(req.user.sub);
  }

  @Post("mfa/activate")
  @ApiOperation({ summary: "Activate MFA after verifying first TOTP code. Returns 10 backup codes." })
  async mfaActivate(@Req() req: Request, @Body() body: MfaActivateDto) {
    if (!req.user) throw new UnauthorizedException();
    return this.mfa.activate(req.user.sub, body.code);
  }

  @Post("mfa/disable")
  @ApiOperation({ summary: "Disable MFA (admin or self)" })
  async mfaDisable(@Req() req: Request) {
    if (!req.user) throw new UnauthorizedException();
    return this.mfa.disable(req.user.sub);
  }
}
