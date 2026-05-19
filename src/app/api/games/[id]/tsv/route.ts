/**
 * Authenticated TSV download for a host's past games.
 *
 * Auth model: session user must be the host of this game. The ownership check
 * is encoded into the SQL (host_user_id = ?) so a guessed gameId returns 404.
 * Distinct from the Socket.io `downloadGameLogs` event, which only works while
 * the game is still in memory and uses the hostToken HMAC.
 */

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getGameTsvForHost } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const dbUserId = (session?.user as { dbUserId?: string } | undefined)?.dbUserId;
  if (!session || !dbUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const tsv = getGameTsvForHost(id, dbUserId);
  if (!tsv) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return new NextResponse(tsv, {
    status: 200,
    headers: {
      'Content-Type': 'text/tab-separated-values; charset=utf-8',
      'Content-Disposition': `attachment; filename="atenu-quiz-${id.slice(0, 8)}.tsv"`,
      'Cache-Control': 'no-store',
    },
  });
}
