import {
  convertToModelMessages,
  createUIMessageStream,
  JsonToSseTransformStream,
  smoothStream,
  stepCountIs,
  streamText,
} from 'ai';
import { auth, type UserType } from '@/app/(auth)/auth';
import { type RequestHints, systemPrompt } from '@/lib/ai/prompts';
import {
  deleteChatById,
  getChatById,
  getMessageCountByUserId,
  getMessagesByChatId,
  saveChat,
  saveMessages,
} from '@/lib/db/mock';
import { convertToUIMessages, generateUUID } from '@/lib/utils';
import { generateTitleFromUserMessage } from '../../actions';
import { createDocument } from '@/lib/ai/tools/create-document';
import { updateDocument } from '@/lib/ai/tools/update-document';
import { requestSuggestions } from '@/lib/ai/tools/request-suggestions';
import { getWeather } from '@/lib/ai/tools/get-weather';
import { isProductionEnvironment } from '@/lib/constants';
import { myProvider } from '@/lib/ai/providers';
import { entitlementsByUserType } from '@/lib/ai/entitlements';
import { postRequestBodySchema, type PostRequestBody } from './schema';
import { geolocation } from '@vercel/functions';

import { ChatSDKError } from '@/lib/errors';
import type { ChatMessage } from '@/lib/types';
import type { ChatModel } from '@/lib/ai/models';
import type { VisibilityType } from '@/components/visibility-selector';
import type { Chat, DBMessage } from '@/lib/db/schema';
import { mastra } from '@/mastra/index';



export const maxDuration = 60;

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  // Check content type
  const contentType = request.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    console.error('Invalid content type:', contentType);
    return new ChatSDKError(
      'bad_request:api',
      'Content-Type must be application/json',
    ).toResponse();
  }

  try {
    const json = await request.json();
    console.log('Received request body:', JSON.stringify(json, null, 2));

    // Check if request body is empty or null
    if (!json || typeof json !== 'object') {
      console.error('Empty or invalid request body');
      return new ChatSDKError(
        'bad_request:api',
        'Request body must be a valid JSON object',
      ).toResponse();
    }

    requestBody = postRequestBodySchema.parse(json);
    console.log('Parsed request body successfully');
  } catch (error) {
    console.error('Schema validation error:', error);
    if (error instanceof Error) {
      return new ChatSDKError('bad_request:api', error.message).toResponse();
    }
    return new ChatSDKError('bad_request:api').toResponse();
  }

  try {
    const {
      id,
      message,
      selectedChatModel,
      selectedVisibilityType,
    }: {
      id: string;
      message: ChatMessage;
      selectedChatModel: ChatModel['id'];
      selectedVisibilityType: VisibilityType;
    } = requestBody;

    const session = await auth();

    if (!session?.user) {
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    const userType: UserType = session.user.type;

    let chat: Chat | null;
    try {
      const messageCountResult = await getMessageCountByUserId({
        userId: session.user.id,
      });

      const messageCount = messageCountResult[0]?.count || 0;

      if (messageCount > entitlementsByUserType[userType].maxMessagesPerDay) {
        return new ChatSDKError('rate_limit:chat').toResponse();
      }

      chat = await getChatById({ id });
    } catch (dbError) {
      console.error('Database error:', dbError);
      return new ChatSDKError(
        'bad_request:api',
        'Database operation failed',
      ).toResponse();
    }

    if (!chat) {
      try {
        const title = await generateTitleFromUserMessage({
          message,
        });

        await saveChat({
          id,
          userId: session.user.id,
          title,
          visibility: selectedVisibilityType,
        });
      } catch (titleError) {
        console.error('Error generating title:', titleError);
        // Use a fallback title if generation fails
        const fallbackTitle = 'New Chat';
        await saveChat({
          id,
          userId: session.user.id,
          title: fallbackTitle,
          visibility: selectedVisibilityType,
        });
      }
    } else {
      if (chat.userId !== session.user.id) {
        return new ChatSDKError('forbidden:chat').toResponse();
      }
    }

    let messagesFromDb: DBMessage[];
    try {
      messagesFromDb = await getMessagesByChatId({ id });
    } catch (messagesError) {
      console.error('Error getting messages:', messagesError);
      return new ChatSDKError(
        'bad_request:api',
        'Failed to get messages',
      ).toResponse();
    }

    const uiMessages = [...convertToUIMessages(messagesFromDb), message];

    let requestHints: RequestHints;
    try {
      const { longitude, latitude, city, country } = geolocation(request);
      requestHints = {
        longitude,
        latitude,
        city,
        country,
      };
    } catch (geoError) {
      console.error('Error getting geolocation:', geoError);
      // Use default values if geolocation fails
      requestHints = {
        longitude: '0',
        latitude: '0',
        city: '',
        country: '',
      };
    }

    try {
      await saveMessages({
        messages: [
          {
            chatId: id,
            id: message.id,
            role: 'user',
            parts: message.parts,
            attachments: [],
          },
        ],
      });
    } catch (saveError) {
      console.error('Error saving messages:', saveError);
      return new ChatSDKError(
        'bad_request:api',
        'Failed to save messages',
      ).toResponse();
    }

    try {
      // Check if we should use Mastra web automation agent
      if (selectedChatModel === 'mastra-web-automation') {
        // Use Mastra web automation agent directly
        const webAutomationAgent = mastra.getAgent('webAutomationAgent');
        
        if (!webAutomationAgent) {
          return new ChatSDKError(
            'bad_request:api',
            'Web automation agent not found'
          ).toResponse();
        }

        // Convert messages to the format expected by Mastra
        const mastraMessages = uiMessages.map(msg => {
          const content = msg.parts.map(part => {
            if (part.type === 'text') {
              return part.text;
            }
            return JSON.stringify(part);
          }).join(' ');
          
          return `${msg.role}: ${content}`;
        });

        // Use the agent's streamVNext method with AI SDK v5 format for compatibility
        // as documented in https://mastra.ai/en/docs/frameworks/agentic-uis/ai-sdk
        const stream = await webAutomationAgent.streamVNext(mastraMessages, {
          format: 'aisdk' // Enable AI SDK v5 compatibility
        });

        // Return the stream as a UI message stream response
        return stream.toUIMessageStreamResponse();
      }
        console.log('Using original AI SDK streaming for other models');
    } catch (streamError) {
      console.error('Error creating stream:', streamError);
      return new ChatSDKError(
        'bad_request:api',
        'Failed to create chat stream',
      ).toResponse();
    }
  } catch (error) {
    console.error('Unexpected error in chat route:', error);
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    // Return a generic error response for unexpected errors
    return new ChatSDKError(
      'bad_request:api',
      'An unexpected error occurred',
    ).toResponse();
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  const chat = await getChatById({ id });

  if (!chat) {
    return new ChatSDKError('not_found:chat').toResponse();
  }

  if (chat.userId !== session.user.id) {
    return new ChatSDKError('forbidden:chat').toResponse();
  }

  const deletedChat = await deleteChatById({ id });

  return Response.json(deletedChat, { status: 200 });
}
