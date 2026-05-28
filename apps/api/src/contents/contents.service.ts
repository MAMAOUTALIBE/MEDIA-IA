import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

/**
 * ContentsService — business logic isolée du controller HTTP.
 *
 * Sprint 9 : surface dédiée au worker n8n (service_automation) pour
 * appliquer tags + summary issus de Claude sur des drafts sans toucher
 * au workflow de validation Camunda.
 */
@Injectable()
export class ContentsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Pose tags + summary sur un Content. Restreint à service_automation
   * via @ExactRoles sur le controller. Idempotent : si le content a
   * déjà des tags, on ne les écrase pas — garde-fou défensif contre
   * une race avec un éditeur humain.
   */
  async applyAutoTags(
    id: string,
    dto: { tags?: string[]; summary?: string },
  ) {
    const existing = await this.prisma.content.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Content ${id} not found`);
    }
    if (existing.tags?.length && dto.tags?.length) {
      return existing;
    }
    return this.prisma.content.update({
      where: { id },
      data: {
        ...(dto.tags !== undefined && { tags: dto.tags }),
        ...(dto.summary !== undefined && { summary: dto.summary }),
      },
    });
  }
}
