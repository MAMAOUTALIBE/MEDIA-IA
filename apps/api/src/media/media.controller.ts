import { BadRequestException, Body, Controller, Get, Post, Query, Req } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import type { Request } from "express";
import { ExactRoles } from "../auth/roles.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "./storage.service";

class PresignUploadDto {
  @IsString() @MaxLength(127)
  contentType!: string;

  @IsInt() @Min(1) @Max(5 * 1024 * 1024 * 1024)
  sizeBytes!: number;

  @IsOptional() @IsString() @MaxLength(127)
  title?: string;

  @IsOptional() @IsString() @MaxLength(10)
  extension?: string;
}

class FinalizeUploadDto {
  @IsString() @MaxLength(255)
  key!: string;

  @IsString() @MaxLength(127)
  contentType!: string;

  @IsInt() @Min(1)
  sizeBytes!: number;

  @IsString() @MaxLength(255)
  title!: string;
}

@ApiTags("media")
@Controller("media")
export class MediaController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  @Get()
  async list(@Query("type") type?: string) {
    const rows = await this.prisma.mediaAsset.findMany({
      where: {
        deletedAt: null,
        ...(type && type !== "all" ? { type: type as never } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return {
      count: rows.length,
      items: rows.map((m) => ({
        ...m,
        sizeBytes: m.sizeBytes !== null ? Number(m.sizeBytes) : null,
      })),
    };
  }

  /**
   * Sprint 4 — Étape 1 : le client demande une presigned URL.
   * Le client uploade ensuite directement vers MinIO/S3, sans transiter par l'API.
   */
  @ExactRoles("editor", "chief", "direction", "community_manager", "admin")
  @Throttle({ "media-upload": { limit: 20, ttl: 60_000 } })
  @Post("upload/presign")
  @ApiOperation({ summary: "Generate presigned PUT URL for direct upload (15 min)" })
  async presign(@Body() body: PresignUploadDto, @Req() req: Request) {
    if (!req.user) throw new BadRequestException();
    try {
      const r = await this.storage.presignUpload({
        userId: req.user.sub,
        contentType: body.contentType,
        sizeBytes: body.sizeBytes,
        extension: body.extension,
      });
      return r;
    } catch (e) {
      throw new BadRequestException(e instanceof Error ? e.message : "presign failed");
    }
  }

  /**
   * Sprint 4 — Étape 2 : le client confirme l'upload terminé → enregistre l'asset en DB.
   * Le contenu effectif sur S3 sera vérifié async par un job de transcoding (Sprint 4b).
   */
  @ExactRoles("editor", "chief", "direction", "community_manager", "admin")
  @Post("upload/finalize")
  @ApiOperation({ summary: "Register uploaded object as MediaAsset" })
  async finalize(@Body() body: FinalizeUploadDto, @Req() req: Request) {
    if (!req.user) throw new BadRequestException();
    const type = body.contentType.startsWith("video/")
      ? "video"
      : body.contentType.startsWith("audio/")
        ? "audio"
        : body.contentType.startsWith("image/")
          ? "image"
          : "document";
    const asset = await this.prisma.mediaAsset.create({
      data: {
        title: body.title,
        type: type as never,
        url: `s3://${process.env.S3_BUCKET ?? "cmr-media"}/${body.key}`,
        mimeType: body.contentType,
        sizeBytes: BigInt(body.sizeBytes),
        uploadedById: req.user.sub,
        tags: ["uploaded", type],
      },
    });
    return {
      ...asset,
      sizeBytes: Number(asset.sizeBytes),
    };
  }
}
