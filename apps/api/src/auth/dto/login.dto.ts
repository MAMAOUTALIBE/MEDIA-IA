import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class LoginDto {
  @ApiProperty({ example: "e.rousseau@cmr.tv" })
  @IsEmail({}, { message: "Email invalide" })
  @MaxLength(254)
  email!: string;

  @ApiProperty({ example: "cmr2025!Dev", minLength: 8, maxLength: 256 })
  @IsString()
  @MinLength(8)
  @MaxLength(256)
  password!: string;
}
