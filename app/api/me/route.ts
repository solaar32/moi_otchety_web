import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { COOKIE_NAME, parseSessionToken } from '@/lib/session';

export async function GET() {
  const cookieStore = await cookies();
  const user = parseSessionToken(cookieStore.get(COOKIE_NAME)?.value);
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user });
}
