'use client';

import type { Attachment, ChatMessage } from '@/lib/types';
import { fetchWithErrorHandlers, fetcher, generateUUID } from '@/lib/utils';
import { useEffect, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';

import { Artifact } from './artifact';
import { ChatHeader } from '@/components/chat-header';
import { ChatSDKError } from '@/lib/errors';
import { DefaultChatTransport } from 'ai';
import { Messages } from './messages';
import { MultimodalInput } from './multimodal-input';
import type { Session } from 'next-auth';
import type { VisibilityType } from './visibility-selector';
import type { Vote } from '@/lib/db/schema';
import { getChatHistoryPaginationKey } from './sidebar-history';
import { toast } from './toast';
import { unstable_serialize } from 'swr/infinite';
import { useArtifactSelector } from '@/hooks/use-artifact';
import { useAutoResume } from '@/hooks/use-auto-resume';
import { useChat } from '@ai-sdk/react';
import { useChatVisibility } from '@/hooks/use-chat-visibility';
import { useDataStream } from './data-stream-provider';
import { useSearchParams } from 'next/navigation';

export function Chat({
  id,
  initialMessages,
  initialChatModel,
  initialVisibilityType,
  isReadonly,
  session,
  autoResume,
}: {
  id: string;
  initialMessages: ChatMessage[];
  initialChatModel: string;
  initialVisibilityType: VisibilityType;
  isReadonly: boolean;
  session: Session;
  autoResume: boolean;
}) {
  const { visibilityType } = useChatVisibility({
    chatId: id,
    initialVisibilityType,
  });

  const { mutate } = useSWRConfig();
  const { setDataStream } = useDataStream();

  const [input, setInput] = useState<string>('');

  const {
    messages,
    setMessages,
    sendMessage,
    status,
    stop,
    regenerate,
    resumeStream,
  } = useChat<ChatMessage>({
    id,
    messages: initialMessages,
    experimental_throttle: 100,
    generateId: generateUUID,
    transport: new DefaultChatTransport({
      api: '/api/chat',
      fetch: fetchWithErrorHandlers,
      prepareSendMessagesRequest({ messages, id, body }) {
        const lastMessage = messages.at(-1);
        if (!lastMessage) {
          console.warn('No last message found');
          return { body: {} };
        }

        const requestBody = {
          id,
          message: {
            id: lastMessage.id,
            role: lastMessage.role,
            parts: lastMessage.parts,
          },
          selectedChatModel: initialChatModel,
          selectedVisibilityType: visibilityType,
          ...body,
        };

        console.log('Prepared request body:', requestBody);
        return { body: requestBody };
      },
    }),
    onData: (dataPart) => {
      setDataStream((ds) => (ds ? [...ds, dataPart] : []));
    },
    onFinish: () => {
      mutate(unstable_serialize(getChatHistoryPaginationKey));
    },
    onError: (error) => {
      console.error('Chat error:', error);
      if (error instanceof ChatSDKError) {
        console.error('ChatSDKError details:', {
          type: error.type,
          surface: error.surface,
          message: error.message,
          cause: error.cause,
          statusCode: error.statusCode,
        });
        toast({
          type: 'error',
          description: error.message,
        });
      } else {
        console.error('Unknown error type:', typeof error);
        toast({
          type: 'error',
          description:
            'An unexpected error occurred. Please check the console for details.',
        });
      }
    },
  });

  const searchParams = useSearchParams();
  const query = searchParams.get('query');

  const [hasAppendedQuery, setHasAppendedQuery] = useState(false);

  useEffect(() => {
    if (query && !hasAppendedQuery) {
      sendMessage({
        role: 'user' as const,
        parts: [{ type: 'text', text: query }],
      });

      setHasAppendedQuery(true);
      window.history.replaceState({}, '', `/chat/${id}`);
    }
  }, [query, sendMessage, hasAppendedQuery, id]);

  const { data: votes } = useSWR<Array<Vote>>(
    messages.length >= 2 ? `/api/vote?chatId=${id}` : null,
    fetcher,
  );

  const [attachments, setAttachments] = useState<Array<Attachment>>([]);
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

  useAutoResume({
    autoResume,
    initialMessages,
    resumeStream,
    setMessages,
  });

  return (
    <>
      <div className="flex flex-col min-w-0 h-dvh bg-background">
        <ChatHeader
          chatId={id}
          selectedModelId={initialChatModel}
          selectedVisibilityType={initialVisibilityType}
          isReadonly={isReadonly}
          session={session}
        />

        <Messages
          chatId={id}
          status={status}
          votes={votes}
          messages={messages}
          setMessages={setMessages}
          regenerate={regenerate}
          isReadonly={isReadonly}
          isArtifactVisible={isArtifactVisible}
        />

        <form className="flex mx-auto px-4 bg-background pb-4 md:pb-6 gap-2 w-full md:max-w-3xl">
          {!isReadonly && (
            <MultimodalInput
              chatId={id}
              input={input}
              setInput={setInput}
              status={status}
              stop={stop}
              attachments={attachments}
              setAttachments={setAttachments}
              messages={messages}
              setMessages={setMessages}
              sendMessage={sendMessage}
              selectedVisibilityType={visibilityType}
            />
          )}
        </form>
      </div>

      <Artifact
        chatId={id}
        input={input}
        setInput={setInput}
        status={status}
        stop={stop}
        attachments={attachments}
        setAttachments={setAttachments}
        sendMessage={sendMessage}
        messages={messages}
        setMessages={setMessages}
        regenerate={regenerate}
        votes={votes}
        isReadonly={isReadonly}
        selectedVisibilityType={visibilityType}
      />
    </>
  );
}
