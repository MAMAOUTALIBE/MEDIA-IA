import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "crypto";

export type DomainEvent =
  | { type: "content.published"; contentId: string; channels: string[]; publishedAt: string }
  | { type: "content.validated"; contentId: string; newStep: string }
  | { type: "content.rejected"; contentId: string; reason?: string | null }
  | { type: "media.uploaded"; mediaId: string; mimeType: string };

export interface EventEnvelope<T extends DomainEvent = DomainEvent> {
  id: string;
  type: T["type"];
  payload: T;
  emittedAt: string;
  retryCount: number;
}

export type EventHandler<T extends DomainEvent = DomainEvent> = (
  envelope: EventEnvelope<T>,
) => Promise<void>;

/**
 * Sprint 5 — Event bus in-memory avec interface prête pour migration Kafka.
 *
 * Pourquoi pas Kafka tout de suite ?
 *   - Le binaire Kafka/Redpanda est lourd à provisionner en dev (3 GB image)
 *   - L'interface `publish(event)` reste identique : il suffit de remplacer
 *     l'implem in-memory par un KafkaProducer pour passer en distribué
 *   - Sprint 5b ajoutera la couche Kafka (kafkajs) + topic-per-event-type
 *     + DLQ + consumer groups par connector
 *
 * Politique de retry actuelle :
 *   - max 3 essais par handler avec backoff exponentiel (1s, 5s, 25s)
 *   - DLQ logguée en console (Sprint 5b : DLQ Kafka topic + alert)
 */
@Injectable()
export class EventBusService {
  private readonly logger = new Logger(EventBusService.name);
  private readonly handlers = new Map<string, EventHandler[]>();

  subscribe<T extends DomainEvent>(type: T["type"], handler: EventHandler<T>) {
    const list = this.handlers.get(type) ?? [];
    list.push(handler as EventHandler);
    this.handlers.set(type, list);
    this.logger.log(`subscribed handler to ${type} (total: ${list.length})`);
  }

  async publish<T extends DomainEvent>(payload: T): Promise<void> {
    const envelope: EventEnvelope<T> = {
      id: randomUUID(),
      type: payload.type,
      payload,
      emittedAt: new Date().toISOString(),
      retryCount: 0,
    };
    const subs = this.handlers.get(payload.type) ?? [];
    this.logger.log(`event ${envelope.id} type=${payload.type} fan-out → ${subs.length} handler(s)`);
    // fire-and-forget — handlers don't block the caller (workflow validate, etc.)
    for (const handler of subs) {
      this.runWithRetry(handler as EventHandler<T>, envelope);
    }
  }

  private async runWithRetry<T extends DomainEvent>(
    handler: EventHandler<T>,
    envelope: EventEnvelope<T>,
  ): Promise<void> {
    const delays = [1000, 5000, 25000];
    for (let attempt = 0; attempt <= delays.length; attempt++) {
      try {
        await handler({ ...envelope, retryCount: attempt });
        return;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "unknown";
        this.logger.warn(
          `handler failed on event ${envelope.id} attempt=${attempt + 1} err=${msg}`,
        );
        if (attempt === delays.length) {
          this.logger.error(`event ${envelope.id} DLQ after ${delays.length + 1} attempts`);
          return;
        }
        await new Promise((r) => setTimeout(r, delays[attempt]!));
      }
    }
  }
}
