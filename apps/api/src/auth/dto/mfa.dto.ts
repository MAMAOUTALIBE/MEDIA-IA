import { IsString, Length, Matches, MaxLength, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class MfaActivateDto {
  @ApiProperty({ example: "123456", description: "6-digit TOTP code from authenticator app" })
  @IsString()
  @Matches(/^\d{6}$/, { message: "Code TOTP doit être 6 chiffres" })
  code!: string;
}

export class MfaVerifyDto {
  @ApiProperty({ description: "MFA challenge token returned by /auth/login" })
  @IsString()
  @MinLength(20)
  @MaxLength(2000)
  mfaChallenge!: string;

  @ApiProperty({ description: "TOTP 6 chiffres ou backup code XXXXX-XXXXX" })
  @IsString()
  @Length(6, 16)
  code!: string;
}

export class RefreshDto {
  @ApiProperty({ description: "Refresh token returned by /auth/login" })
  @IsString()
  @MinLength(20)
  refreshToken!: string;
}
