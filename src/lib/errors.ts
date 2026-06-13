export class HttpError extends Error {
  constructor(
    public readonly status : number,
    public readonly code   : string,
    message                : string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const ErrorCodes = {
  // Auth
  EMAIL_TAKEN            : 'EMAIL_TAKEN',
  PHONE_TAKEN            : 'PHONE_TAKEN',
  INVALID_CREDENTIALS    : 'INVALID_CREDENTIALS',
  ACCOUNT_DISABLED       : 'ACCOUNT_DISABLED',
  INVITE_INVALID         : 'INVITE_INVALID',
  INVITE_EXPIRED         : 'INVITE_EXPIRED',
  // Access
  NOT_AUTHORIZED         : 'NOT_AUTHORIZED',
  NOT_ASSIGNED_TO_JOB    : 'NOT_ASSIGNED_TO_JOB',
  NOT_LINKED             : 'NOT_LINKED',
  // Business logic
  APPROVED_LOCKED        : 'APPROVED_LOCKED',
  ALREADY_PENDING        : 'ALREADY_PENDING',
  NO_APPROVED_SUBMISSIONS: 'NO_APPROVED_SUBMISSIONS',
  INVALID_SELECTION      : 'INVALID_SELECTION',
  // Generic
  NOT_FOUND              : 'NOT_FOUND',
  VALIDATION_ERROR       : 'VALIDATION_ERROR',
  RATE_LIMITED           : 'RATE_LIMITED',
  INTERNAL               : 'INTERNAL',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];
