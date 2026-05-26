import { Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { ChannelKey } from "@prisma/client";
import type { EventEnvelope } from "./event-bus.service";

/**
 * Sprint 5 — Connector pattern.
 *
 * Chaque connecteur :
 *  - publie un Content sur une plateforme externe (YouTube, FB, X, etc.)
 *  - met à jour Publication.status (publishing → published | failed)
 *  - stocke external_id / external_url retournés par l'API tierce
 *  - log dans audit chain (publish | reject)
 *
 * Pour Sprint 5 baseline, les implémentations sont des STUBS qui simulent
 * un succès 90% / échec 10% (pour tester le retry/DLQ). Les vraies API
 * (YouTube Data v3, Meta Graph, TikTok Content, etc.) viendront Sprint 5b
 * derrière des feature flags.
 */

export interface PublisherConnector {
  channel: ChannelKey;
  publish(contentId: string, formatVariant?: string): Promise<{ externalId: string; externalUrl: string }>;
}

class StubConnector implements PublisherConnector {
  constructor(public readonly channel: ChannelKey, private readonly logger: Logger) {}
  async publish(contentId: string): Promise<{ externalId: string; externalUrl: string }> {
    // 90% success rate to exercise retry path
    if (Math.random() < 0.1) throw new Error(`stub ${this.channel} transient failure`);
    const externalId = `${this.channel}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.logger.log(`stub publish to ${this.channel} → ${externalId}`);
    return { externalId, externalUrl: `https://example.${this.channel}.test/${externalId}` };
  }
}

export function buildConnectors(logger: Logger): Record<ChannelKey, PublisherConnector> {
  return {
    web: new StubConnector("web", logger),
    mobile: new StubConnector("mobile", logger),
    youtube: new StubConnector("youtube", logger),
    facebook: new StubConnector("facebook", logger),
    instagram: new StubConnector("instagram", logger),
    twitter: new StubConnector("twitter", logger),
    tiktok: new StubConnector("tiktok", logger),
    telegram: new StubConnector("telegram", logger),
    smarttv: new StubConnector("smarttv", logger),
  };
}

/**
 * Handler racine attaché à `content.published` event :
 *  - lit ContentChannel rows pour ce content
 *  - pour chaque channel : crée Publication (status=publishing) → appelle
 *    le connector → update Publication (status=published | failed)
 *
 * Le retry du connector est géré au niveau EventBus (3 essais avec backoff).
 * Une failed publication n'arrête PAS les autres channels (boucle parallèle).
 */
export async function fanOutPublication(
  envelope: EventEnvelope,
  prisma: PrismaService,
  connectors: Record<ChannelKey, PublisherConnector>,
  logger: Logger,
) {
  if (envelope.payload.type !== "content.published") return;
  const { contentId } = envelope.payload;
  const channels = await prisma.contentChannel.findMany({
    where: { contentId },
    select: { channel: true },
  });
  await Promise.all(
    channels.map(async ({ channel }) => {
      const con = connectors[channel];
      if (!con) {
        logger.warn(`no connector for channel ${channel}`);
        return;
      }
      const pub = await prisma.publication.create({
        data: {
          contentId,
          channel,
          status: "publishing",
          scheduledAt: new Date(),
        },
      });
      try {
        const { externalId, externalUrl } = await con.publish(contentId);
        await prisma.publication.update({
          where: { id: pub.id },
          data: { status: "published", publishedAt: new Date(), externalId, externalUrl },
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "unknown";
        await prisma.publication.update({
          where: { id: pub.id },
          data: {
            status: "failed",
            errorMessage: msg,
            retryCount: { increment: 1 },
          },
        });
        throw e; // bubble up to retry policy
      }
    }),
  );
}
