import { ApiProperty } from "@nestjs/swagger";
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

const CONTENT_TYPES = ["article", "video", "audio", "social"] as const;
type ContentType = (typeof CONTENT_TYPES)[number];

const CHANNELS = [
  "web",
  "mobile",
  "youtube",
  "facebook",
  "instagram",
  "twitter",
  "tiktok",
  "telegram",
  "smarttv",
] as const;
type Channel = (typeof CHANNELS)[number];

export class CreateContentDto {
  @ApiProperty({ minLength: 3, maxLength: 200, example: "Politique — Réforme éducative" })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @ApiProperty({ required: false, maxLength: 50_000 })
  @IsOptional()
  @IsString()
  @MaxLength(50_000)
  body?: string;

  @ApiProperty({ required: false, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  excerpt?: string;

  @ApiProperty({ enum: CONTENT_TYPES, example: "article" })
  @IsIn(CONTENT_TYPES as unknown as string[])
  type!: ContentType;

  @ApiProperty({ required: false, isArray: true, enum: CHANNELS, maxItems: 9 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(9)
  @IsIn(CHANNELS as unknown as string[], { each: true })
  channels?: Channel[];
}
