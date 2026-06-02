import pino, { type Logger } from 'pino';

export const rootLogger: Logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  ...(process.env.NODE_ENV !== 'production' && {
    transport: {
      target : 'pino-pretty',
      options: { colorize: true, ignore: 'pid,hostname' },
    },
  }),
});

export function createRequestLogger(requestId: string): Logger {
  return rootLogger.child({ requestId });
}
