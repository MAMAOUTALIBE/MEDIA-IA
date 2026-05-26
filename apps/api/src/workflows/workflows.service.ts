import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { createHash } from "crypto";
import { Prisma } from "@prisma/client";
import type { WorkflowStep } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { EventBusService } from "../publishing/event-bus.service";

const STEP_ORDER: WorkflowStep[] = ["submitted", "editor", "chief", "direction", "published"];

/**
 * Workflow service — Sprint 2 :
 *  - Pipeline DB-backed via WorkflowInstance + ValidationAction
 *  - Cosignature : chaque transition crée une ValidationAction signée SHA-256
 *  - Audit chaîné : log dans AuditEvent.checksum chain
 *  - Pas de Camunda 8 pour l'instant (Sprint 2 v2 — voir docs/adr/007 à venir)
 *
 * Matrice rôles → step requis pour valider :
 *  - editor    → editor
 *  - chief     → chief
 *  - direction → direction
 *  - admin     → tous (override)
 */
@Injectable()
export class WorkflowsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly bus: EventBusService,
  ) {}

  private nextStep(current: WorkflowStep): WorkflowStep | null {
    const idx = STEP_ORDER.indexOf(current);
    if (idx === -1 || idx === STEP_ORDER.length - 1) return null;
    return STEP_ORDER[idx + 1]!;
  }

  /** Rôle requis pour valider depuis l'étape `step`. */
  private requiredRoleFor(step: WorkflowStep): string {
    switch (step) {
      case "submitted":
      case "editor":
        return "editor";
      case "chief":
        return "chief";
      case "direction":
        return "direction";
      default:
        return "admin";
    }
  }

  private signature(actorId: string, decision: string, instanceId: string, fromStep: WorkflowStep, toStep: WorkflowStep, comment?: string | null) {
    const payload = `${actorId}|${decision}|${instanceId}|${fromStep}|${toStep}|${comment ?? ""}|${Date.now()}`;
    return createHash("sha256").update(payload).digest("hex");
  }

  async listPending() {
    const rows = await this.prisma.workflowInstance.findMany({
      where: { currentStep: { not: "published" }, completedAt: null },
      include: {
        content: { select: { id: true, title: true, type: true, thumbnailUrl: true } },
        submittedBy: { select: { id: true, name: true, initials: true, color: true } },
      },
      orderBy: { startedAt: "asc" },
    });
    return rows.map((r) => ({
      id: r.id,
      contentId: r.contentId,
      title: r.content.title,
      type: r.content.type,
      thumbnail: r.content.thumbnailUrl,
      author: r.submittedBy,
      step: r.currentStep,
      submittedAt: r.startedAt.toISOString(),
    }));
  }

  async listAll() {
    const rows = await this.prisma.workflowInstance.findMany({
      include: {
        content: { select: { id: true, title: true, type: true } },
        submittedBy: { select: { id: true, name: true, initials: true, color: true } },
      },
      orderBy: { startedAt: "desc" },
      take: 100,
    });
    const stepCounts = {
      submitted: 0,
      editor: 0,
      chief: 0,
      direction: 0,
      published: 0,
    };
    for (const r of rows) stepCounts[r.currentStep]++;
    return { count: rows.length, items: rows, stepCounts };
  }

  /**
   * Avancer le workflow : crée une ValidationAction signée + met à jour currentStep.
   * `actor` doit avoir le rôle requis pour le step courant.
   */
  async advance(
    instanceId: string,
    actorId: string,
    actorRole: string,
    decision: "approve" | "reject" | "request_changes",
    comment?: string | null,
    ip?: string,
    userAgent?: string,
  ) {
    const instance = await this.prisma.workflowInstance.findUnique({
      where: { id: instanceId },
      include: { content: true },
    });
    if (!instance) throw new NotFoundException(`Workflow ${instanceId} introuvable`);
    if (instance.completedAt) throw new BadRequestException("Workflow déjà clôturé");

    // RBAC : seul un rôle ≥ requiredRoleFor(step) peut valider/rejeter
    const requiredRole = this.requiredRoleFor(instance.currentStep);
    const RANK: Record<string, number> = {
      journalist: 1, community_manager: 1, editor: 2, chief: 3, direction: 4, admin: 5,
    };
    if ((RANK[actorRole] ?? 0) < (RANK[requiredRole] ?? 99)) {
      throw new ForbiddenException(`Rôle '${actorRole}' insuffisant pour le step '${instance.currentStep}'`);
    }

    if (decision === "approve") {
      const next = this.nextStep(instance.currentStep);
      if (!next) throw new BadRequestException("Déjà publié");
      const signatureHash = this.signature(actorId, decision, instanceId, instance.currentStep, next, comment);

      const [, updated] = await this.prisma.$transaction([
        this.prisma.validationAction.create({
          data: {
            instanceId,
            actorId,
            fromStep: instance.currentStep,
            toStep: next,
            decision: "approve",
            comment,
            signatureHash,
          },
        }),
        this.prisma.workflowInstance.update({
          where: { id: instanceId },
          data: {
            currentStep: next,
            completedAt: next === "published" ? new Date() : null,
          },
          include: { content: true },
        }),
      ]);
      // also mark Content.status if reached published
      if (next === "published") {
        await this.prisma.content.update({
          where: { id: instance.contentId },
          data: { status: "published", publishedAt: new Date() },
        });
        const channels = await this.prisma.contentChannel.findMany({
          where: { contentId: instance.contentId },
          select: { channel: true },
        });
        // Fire-and-forget : déclenche le fan-out via les connectors (Sprint 5)
        void this.bus.publish({
          type: "content.published",
          contentId: instance.contentId,
          channels: channels.map((c) => c.channel),
          publishedAt: new Date().toISOString(),
        });
      } else {
        await this.prisma.content.update({
          where: { id: instance.contentId },
          data: { status: `pending_${next}` as never },
        });
      }
      await this.audit.log({
        action: "validate",
        target: instance.contentId,
        severity: next === "published" ? "info" : "info",
        actorId,
        ip,
        userAgent,
        metadata: { fromStep: instance.currentStep, toStep: next, signatureHash, comment } as Prisma.InputJsonValue,
      });
      return { ok: true, instance: updated, fromStep: instance.currentStep, toStep: next, signatureHash };
    }

    // reject or request_changes
    const signatureHash = this.signature(actorId, decision, instanceId, instance.currentStep, "submitted", comment);
    const [, updated] = await this.prisma.$transaction([
      this.prisma.validationAction.create({
        data: {
          instanceId,
          actorId,
          fromStep: instance.currentStep,
          toStep: "submitted",
          decision,
          comment,
          signatureHash,
        },
      }),
      this.prisma.workflowInstance.update({
        where: { id: instanceId },
        data: { currentStep: "submitted" },
      }),
    ]);
    await this.prisma.content.update({
      where: { id: instance.contentId },
      data: { status: "rejected" },
    });
    await this.audit.log({
      action: "reject",
      target: instance.contentId,
      severity: "warning",
      actorId,
      ip,
      userAgent,
      metadata: { fromStep: instance.currentStep, decision, signatureHash, comment } as Prisma.InputJsonValue,
    });
    return { ok: true, instance: updated, decision, signatureHash };
  }

  /** Récupère l'historique des actions signées d'une instance. */
  async history(instanceId: string) {
    return this.prisma.validationAction.findMany({
      where: { instanceId },
      include: { actor: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: "asc" },
    });
  }
}
