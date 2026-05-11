import crypto from 'crypto';
import type { Role, User } from './types';

const COOKIE_NAME = 'moi_otchety_session';

export { COOKIE_NAME };

function secret() {
  return process.env.NEXTAUTH_SECRET || 'change_me_secret';
}

function sign(payload: string) {
  return crypto.createHmac('sha256', secret()).update(payload).digest('hex');
}

export function createSessionToken(user: User) {
  const payload = Buffer.from(JSON.stringify(user), 'utf8').toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function parseSessionToken(token?: string): User | null {
  if (!token) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature || sign(payload) !== signature) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as User;
    if (parsed.role !== 'admin' && parsed.role !== 'worker') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function dbRoleToClient(role: string): Role {
  return role === 'ADMIN' ? 'admin' : 'worker';
}
