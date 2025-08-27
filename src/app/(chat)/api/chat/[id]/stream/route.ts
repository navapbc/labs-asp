import { ChatSDKError } from '@/lib/errors';
import { auth } from '@/app/(auth)/auth';

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: chatId } = await params;

  if (!chatId) {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  // Simple response for stream endpoint - no resumable streams needed
  return new Response('Stream endpoint available', { status: 200 });
}
