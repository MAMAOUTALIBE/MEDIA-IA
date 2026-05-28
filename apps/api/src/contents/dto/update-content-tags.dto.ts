import { ApiProperty } from "@nestjs/swagger";
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class UpdateContentTagsDto {
  @ApiProperty({
    type: [String],
    maxItems: 10,
    example: ["politique", "mali", "budget"],
    required: false,
  })
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiProperty({
    maxLength: 500,
    example: "Le gouvernement présente le budget 2026...",
    required: false,
  })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  summary?: string;
}
