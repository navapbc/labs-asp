import type { ChatModel } from './models';
import type { UserType } from '@/app/(auth)/auth';

interface Entitlements {
  maxMessagesPerDay: number;
  availableChatModelIds: Array<ChatModel['id']>;
}

export const entitlementsByUserType: Record<UserType, Entitlements> = {
  /*
   * For users without an account
   */
  guest: {
    maxMessagesPerDay: 20,
    availableChatModelIds: ['chat-model', 'chat-model-reasoning', 'mastra-web-automation'],
  },

  /*
   * For users with an account
   */
  regular: {
    maxMessagesPerDay: 100,
    availableChatModelIds: ['chat-model', 'chat-model-reasoning', 'mastra-web-automation'],
  },

  /*
   * TODO: For users with an account and a paid membership
   */
};
