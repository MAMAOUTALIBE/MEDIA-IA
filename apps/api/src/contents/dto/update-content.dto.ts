import { PartialType, OmitType } from "@nestjs/swagger";
import { CreateContentDto } from "./create-content.dto";

/**
 * Tous les champs de création sauf `type` (immuable après création — un
 * journaliste change le titre/body de son draft, pas son type).
 */
export class UpdateContentDto extends PartialType(
  OmitType(CreateContentDto, ["type"] as const),
) {}
