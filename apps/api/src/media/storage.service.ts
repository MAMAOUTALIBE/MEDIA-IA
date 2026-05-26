import { Injectable, Logger } from "@nestjs/common";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomBytes } from "crypto";

const ENDPOINT = process.env.S3_ENDPOINT ?? "http://localhost:9100";
const REGION = process.env.S3_REGION ?? "us-east-1";
const BUCKET = process.env.S3_BUCKET ?? "cmr-media";
const ACCESS_KEY = process.env.S3_ACCESS_KEY ?? "cmr-minio";
const SECRET_KEY = process.env.S3_SECRET_KEY ?? "cmr-minio-dev-changeme";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "audio/mpeg",
  "audio/aac",
  "audio/wav",
  "audio/ogg",
  "application/pdf",
  "text/plain",
]);

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3: S3Client;

  constructor() {
    this.s3 = new S3Client({
      endpoint: ENDPOINT,
      region: REGION,
      forcePathStyle: true, // required by MinIO
      credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
    });
    this.logger.log(`StorageService init → ${ENDPOINT} bucket=${BUCKET}`);
  }

  validateMime(mime: string) {
    if (!ALLOWED_MIME.has(mime)) {
      throw new Error(`MIME type non autorisé: ${mime}`);
    }
  }

  /**
   * Génère une presigned URL PUT pour upload direct du client vers S3/MinIO.
   * Le client envoie ensuite le fichier en PUT avec Content-Type approprié.
   */
  async presignUpload(opts: {
    userId: string;
    contentType: string;
    sizeBytes: number;
    extension?: string;
  }): Promise<{ uploadUrl: string; key: string; publicUrl: string; expiresIn: number }> {
    this.validateMime(opts.contentType);
    if (opts.sizeBytes > MAX_UPLOAD_BYTES) {
      throw new Error(`Fichier trop volumineux (max ${MAX_UPLOAD_BYTES} bytes)`);
    }
    const yyyymm = new Date().toISOString().slice(0, 7); // 2026-05
    const id = randomBytes(16).toString("hex");
    const ext = (opts.extension ?? opts.contentType.split("/")[1] ?? "bin").replace(/[^a-z0-9]/gi, "");
    const key = `uploads/${yyyymm}/${opts.userId}/${id}.${ext}`;
    const cmd = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: opts.contentType,
      ContentLength: opts.sizeBytes,
      Metadata: { uploadedBy: opts.userId },
    });
    const expiresIn = 15 * 60; // 15 min
    const uploadUrl = await getSignedUrl(this.s3, cmd, { expiresIn });
    const publicUrl = `${ENDPOINT}/${BUCKET}/${key}`;
    return { uploadUrl, key, publicUrl, expiresIn };
  }

  /**
   * Génère une presigned URL GET pour télécharger un objet privé.
   */
  async presignDownload(key: string, expiresIn = 5 * 60): Promise<string> {
    const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
    return getSignedUrl(this.s3, cmd, { expiresIn });
  }
}
