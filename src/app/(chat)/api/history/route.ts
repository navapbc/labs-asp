import { ChatSDKError } from '@/lib/errors';
import type { NextRequest } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getChatsByUserId } from '@/lib/db/mock';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const limit = Number.parseInt(searchParams.get('limit') || '10');
  const startingAfter = searchParams.get('starting_after');
  const endingBefore = searchParams.get('ending_before');

  if (startingAfter && endingBefore) {
    return new ChatSDKError(
      'bad_request:api',
      'Only one of starting_after or ending_before can be provided.',
    ).toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  const chats = await getChatsByUserId({
    userId: session.user.id,
    limit,
    offset: startingAfter ? 1 : 0,
  });

  // Return in the expected ChatHistory format
  return Response.json({
    chats,
    hasMore: chats.length === limit, // Simple pagination logic
  });
}
