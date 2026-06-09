import { AuditLog } from '@/lib/models/AuditLog';
import { connectDB } from '@/lib/db';
import type { Logger } from 'pino';

export interface AuditOptions {
  action    : string;
  requestId : string;
  userId?   : string;
  userName? : string;
  userRole? : 'painter' | 'owner' | 'admin';
  ip        : string;
  userAgent?: string;
  statusCode: number;
  duration  : number;
  resource? : { type: string; id: string };
  metadata? : Record<string, unknown>;
}

// Fire-and-forget — never awaited, never blocks the response
export function writeAuditLog(opts: AuditOptions, logger: Logger): void {
  connectDB()
    .then(() => AuditLog.create({ ...opts, timestamp: new Date() }))
    .catch((err) => logger.error({ err }, 'audit write failed'));
}
