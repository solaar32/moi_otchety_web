import { cookies } from 'next/headers';
import { COOKIE_NAME, parseSessionToken } from './session';
import type { User } from './types';

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  return parseSessionToken(cookieStore.get(COOKIE_NAME)?.value);
}
