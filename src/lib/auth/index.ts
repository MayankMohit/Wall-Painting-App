import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export type TokenPayload = {
  userId: string;
  role: 'painter' | 'owner' | 'admin';
};

const JWT_SECRET = process.env.JWT_SECRET!;
const BCRYPT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d', algorithm: 'HS256' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}
