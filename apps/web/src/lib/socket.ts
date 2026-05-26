"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { SOCKET_URL } from "@/lib/api-client";

export interface SocketActivityEvent {
  type: "publication" | "validation" | "comment" | "automation" | "alert";
  actor: { name: string; initials: string; color: string };
  message: string;
  at: string;
}

export interface ContentValidatedEvent {
  id: string;
  contentId: string;
  title: string;
  previousStep: string;
  newStep: string;
  comment: string | null;
  at: string;
}

export interface ContentRejectedEvent {
  id: string;
  contentId: string;
  title: string;
  reason: string | null;
  at: string;
}

export interface WorkflowAdvancedEvent {
  id: string;
  contentTitle: string;
  previousStep: number;
  newStep: number;
  comment: string | null;
  at: string;
}

export interface SocketStatus {
  connected: boolean;
  lastHeartbeat?: number;
  serverTick?: number;
}

export interface SocketHandlers {
  onActivity?: (e: SocketActivityEvent) => void;
  onContentValidated?: (e: ContentValidatedEvent) => void;
  onContentRejected?: (e: ContentRejectedEvent) => void;
  onWorkflowAdvanced?: (e: WorkflowAdvancedEvent) => void;
}

const STEP_LABEL: Record<string, string> = {
  editor: "Rédacteur",
  chief: "Chef d'édition",
  direction: "Direction",
  submitted: "Soumis",
  published: "Publié",
  "1": "Journaliste",
  "2": "Rédacteur",
  "3": "Chef d'édition",
  "4": "Direction",
  "5": "Publication",
};

function labelFor(step: string | number): string {
  return STEP_LABEL[String(step)] ?? String(step);
}

/**
 * Hook qui écoute le namespace WebSocket /notifications de l'API.
 *
 * Surcharge des handlers selon les types d'événements souhaités. Tous les
 * événements de mutation (`content.validated`, `content.rejected`,
 * `workflow.advanced`) sont aussi convertis en `SocketActivityEvent` et passés
 * à `onActivity` pour alimenter automatiquement l'activity feed du dashboard.
 */
export function useSocketActivity(handlers: SocketHandlers | ((e: SocketActivityEvent) => void) = {}): SocketStatus {
  const [status, setStatus] = useState<SocketStatus>({ connected: false });
  const socketRef = useRef<Socket | null>(null);

  // Normalise : si on reçoit juste une fonction, on l'attribue à onActivity
  const handlersObj: SocketHandlers =
    typeof handlers === "function" ? { onActivity: handlers } : handlers;
  const handlersRef = useRef(handlersObj);
  handlersRef.current = handlersObj;

  useEffect(() => {
    if (!SOCKET_URL) return;
    const socket = io(`${SOCKET_URL}/notifications`, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 10,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setStatus((s) => ({ ...s, connected: true }));
    });
    socket.on("disconnect", () => {
      setStatus((s) => ({ ...s, connected: false }));
    });
    socket.on("heartbeat", (data: { ts: number; tick: number }) => {
      setStatus((s) => ({ ...s, lastHeartbeat: data.ts, serverTick: data.tick }));
    });
    socket.on("activity", (event: SocketActivityEvent) => {
      handlersRef.current.onActivity?.(event);
    });
    socket.on("content.validated", (event: ContentValidatedEvent) => {
      handlersRef.current.onContentValidated?.(event);
      // Auto-pousser dans l'activity feed
      handlersRef.current.onActivity?.({
        type: "validation",
        actor: { name: "Validation", initials: "✓", color: "#10b981" },
        message: `« ${event.title} » a franchi l'étape ${labelFor(event.previousStep)} → ${labelFor(event.newStep)}`,
        at: event.at,
      });
    });
    socket.on("content.rejected", (event: ContentRejectedEvent) => {
      handlersRef.current.onContentRejected?.(event);
      handlersRef.current.onActivity?.({
        type: "alert",
        actor: { name: "Rejet éditorial", initials: "✗", color: "#ef4444" },
        message: `« ${event.title} » a été rejeté${event.reason ? " : " + event.reason : ""}`,
        at: event.at,
      });
    });
    socket.on("workflow.advanced", (event: WorkflowAdvancedEvent) => {
      handlersRef.current.onWorkflowAdvanced?.(event);
      handlersRef.current.onActivity?.({
        type: "validation",
        actor: { name: "Workflow", initials: "↗", color: "#a78bfa" },
        message: `Pipeline « ${event.contentTitle} » avancé étape ${event.previousStep} → ${event.newStep}`,
        at: event.at,
      });
    });

    return () => {
      socket.off();
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return status;
}
