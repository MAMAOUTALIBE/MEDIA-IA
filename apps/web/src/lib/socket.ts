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

export interface SocketStatus {
  connected: boolean;
  lastHeartbeat?: number;
  serverTick?: number;
}

/**
 * Hook qui écoute le namespace WebSocket /notifications de l'API.
 *
 * - Si `NEXT_PUBLIC_SOCKET_URL` n'est pas défini → ne tente pas de connexion
 *   (le composant appelant peut basculer sur sa logique mock locale).
 * - Si défini → connexion auto, événements pushés via callbacks.
 *
 * Retourne `connected: false` tant que la handshake n'a pas réussi.
 */
export function useSocketActivity(onActivity?: (event: SocketActivityEvent) => void): SocketStatus {
  const [status, setStatus] = useState<SocketStatus>({ connected: false });
  const socketRef = useRef<Socket | null>(null);
  const callbackRef = useRef(onActivity);
  callbackRef.current = onActivity;

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
      callbackRef.current?.(event);
    });

    return () => {
      socket.off();
      socket.disconnect();
    };
  }, []);

  return status;
}
