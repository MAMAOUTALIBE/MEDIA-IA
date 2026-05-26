import { Logger } from "@nestjs/common";
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";

@WebSocketGateway({
  namespace: "/notifications",
  cors: {
    origin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
    credentials: true,
  },
})
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger("NotificationsGateway");
  private heartbeatTimer?: NodeJS.Timeout;
  private activityTimer?: NodeJS.Timeout;
  private tick = 0;

  afterInit() {
    this.logger.log("WebSocket gateway ready on /notifications");
    // Heartbeat — server-side pulse every 5s for clients to verify connection
    this.heartbeatTimer = setInterval(() => {
      this.server.emit("heartbeat", { ts: Date.now(), tick: ++this.tick });
    }, 5000);

    // Simulated activity stream — pushes a fake event every 8-12s
    const scheduleActivity = () => {
      const delay = 8000 + Math.random() * 4000;
      this.activityTimer = setTimeout(() => {
        const sample = SAMPLE_ACTIVITY[Math.floor(Math.random() * SAMPLE_ACTIVITY.length)];
        this.server.emit("activity", { ...sample, at: new Date().toISOString() });
        scheduleActivity();
      }, delay);
    };
    scheduleActivity();
  }

  handleConnection(client: Socket) {
    this.logger.log(`client connected: ${client.id}`);
    client.emit("welcome", { id: client.id, message: "Connecté au flux temps réel CMR" });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`client disconnected: ${client.id}`);
  }

  /** External call to broadcast a custom payload (used by controllers). */
  broadcast(event: string, payload: unknown) {
    this.server.emit(event, payload);
  }
}

const SAMPLE_ACTIVITY = [
  { type: "publication", actor: { name: "Karim Benali", initials: "KB", color: "#10b981" }, message: "A publié un format vertical sur TikTok" },
  { type: "validation", actor: { name: "Sophie Martin", initials: "SM", color: "#c084fc" }, message: "A validé l'enquête « Société — Logement étudiant »" },
  { type: "automation", actor: { name: "Automation", initials: "AU", color: "#10b981" }, message: "Transcription Whisper terminée — sous-titres FR" },
  { type: "comment", actor: { name: "Vincent Moreau", initials: "VM", color: "#f472b6" }, message: "A commenté la tribune libre" },
  { type: "publication", actor: { name: "Aïssatou Diop", initials: "AD", color: "#22d3ee" }, message: "A diffusé une dépêche Flash Info sur X et Telegram" },
  { type: "alert", actor: { name: "Système IA", initials: "IA", color: "#f59e0b" }, message: "Score IA recalculé pour l'édito vidéo — 99/100" },
];
