import type {
  Chat,
  DBMessage,
  Document,
  Suggestion,
  User,
  Vote,
} from './schema';

// Simple in-memory data store - no database required
import { generateUUID } from '@/lib/utils';

// Define VisibilityType locally since it's not in the schema
type VisibilityType = 'public' | 'private';

// In-memory storage
const mockUsers = new Map<string, User>();
const mockChats = new Map<string, Chat>();
const mockMessages = new Map<string, DBMessage>();
const mockVotes = new Map<string, Vote>();
const mockDocuments = new Map<string, Document>();
const mockSuggestions = new Map<string, Suggestion>();

// Initialize with some sample data
const sampleUser: User = {
  id: 'sample-user',
  email: 'user@example.com',
  password: 'mock-password-hash',
};

const sampleChat: Chat = {
  id: 'sample-chat',
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  userId: 'sample-user',
  title: 'Welcome Chat',
  visibility: 'private',
};

const sampleMessage: DBMessage = {
  id: 'sample-message',
  chatId: 'sample-chat',
  role: 'assistant',
  parts: [
    { type: 'text', text: 'Hello! Welcome to your simple chat interface.' },
  ],
  attachments: [],
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
};

// Initialize data
mockUsers.set(sampleUser.id, sampleUser);
mockChats.set(sampleChat.id, sampleChat);
mockMessages.set(sampleMessage.id, sampleMessage);

// Simple password hashing (for demo purposes)
function generateHashedPassword(password: string): string {
  return `hashed-${password}`;
}

// User functions
export async function getUser(email: string): Promise<Array<User>> {
  const users = Array.from(mockUsers.values()).filter(
    (user) => user.email === email,
  );
  if (users.length === 0) {
    // Create a new user if none exists
    const newUser: User = {
      id: generateUUID(),
      email,
      password: generateHashedPassword('password'),
    };
    mockUsers.set(newUser.id, newUser);
    return [newUser];
  }
  return users;
}

export async function createUser(email: string, password: string) {
  const hashedPassword = generateHashedPassword(password);
  const newUser: User = {
    id: generateUUID(),
    email,
    password: hashedPassword,
  };
  mockUsers.set(newUser.id, newUser);
  return { insertId: newUser.id };
}

export async function createGuestUser() {
  const guestCount = mockUsers.size + 1;
  const email = `guest-${guestCount}@example.com`;
  const password = generateHashedPassword('guest-password');

  const newUser: User = {
    id: `guest-${guestCount}`,
    email,
    password,
  };
  mockUsers.set(newUser.id, newUser);
  return [newUser];
}

// Chat functions
export async function saveChat({
  id,
  userId,
  title,
  visibility,
}: {
  id: string;
  userId: string;
  title: string;
  visibility: VisibilityType;
}) {
  const newChat: Chat = {
    id,
    createdAt: new Date(),
    userId,
    title,
    visibility,
  };
  mockChats.set(id, newChat);
  return { insertId: id };
}

export async function deleteChatById({ id }: { id: string }) {
  mockChats.delete(id);
  // Also delete related messages and votes
  Array.from(mockMessages.values())
    .filter((msg) => msg.chatId === id)
    .forEach((msg) => mockMessages.delete(msg.id));
  Array.from(mockVotes.values())
    .filter((vote) => vote.chatId === id)
    .forEach((vote) => mockVotes.delete(`${vote.chatId}-${vote.messageId}`));
  return { affectedRows: 1 };
}

export async function getChatsByUserId({
  userId,
  limit = 50,
  offset = 0,
}: {
  userId: string;
  limit?: number;
  offset?: number;
}) {
  const chats = Array.from(mockChats.values())
    .filter((chat) => chat.userId === userId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(offset, offset + limit);
  return chats;
}

export async function getChatById({ id }: { id: string }) {
  return mockChats.get(id) || null;
}

// Message functions
export async function saveMessages({
  messages,
}: {
  messages: Array<{
    id: string;
    chatId: string;
    role: string;
    parts: any[];
    attachments: any[];
  }>;
}) {
  const savedMessages: DBMessage[] = [];
  for (const msg of messages) {
    const newMessage: DBMessage = {
      ...msg,
      createdAt: new Date(),
    };
    mockMessages.set(msg.id, newMessage);
    savedMessages.push(newMessage);
  }
  return savedMessages;
}

export async function getMessagesByChatId({ id }: { id: string }) {
  const messages = Array.from(mockMessages.values())
    .filter((msg) => msg.chatId === id)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  return messages;
}

// Vote functions
export async function voteMessage({
  chatId,
  messageId,
  isUpvoted,
}: {
  chatId: string;
  messageId: string;
  isUpvoted: boolean;
}) {
  const voteKey = `${chatId}-${messageId}`;
  const newVote: Vote = {
    chatId,
    messageId,
    isUpvoted,
  };
  mockVotes.set(voteKey, newVote);
  return { insertId: voteKey };
}

export async function getVotesByChatId({ id }: { id: string }) {
  const votes = Array.from(mockVotes.values()).filter(
    (vote) => vote.chatId === id,
  );
  return votes;
}

// Document functions
export async function saveDocument({
  chatId,
  content,
  title = 'Document',
  kind = 'text',
  userId,
}: {
  chatId: string;
  content: string;
  title?: string;
  kind?: string;
  userId: string;
}) {
  const newDocument: Document = {
    id: generateUUID(),
    title,
    content,
    kind: kind as any,
    userId,
    createdAt: new Date(),
  };
  mockDocuments.set(newDocument.id, newDocument);
  return [newDocument];
}

export async function getDocumentsById({ id }: { id: string }) {
  // Return empty array for now
  return [];
}

export async function getDocumentById({ id }: { id: string }) {
  return mockDocuments.get(id) || null;
}

export async function deleteDocumentsByIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  // Mock function - return 0 for now since documents don't have chatId
  return { affectedRows: 0 };
}

// Suggestion functions
export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Array<{
    id: string;
    documentId: string;
    originalText: string;
    suggestedText: string;
    description: string | null;
    isResolved: boolean;
    userId: string;
    createdAt: Date;
    documentCreatedAt: Date;
  }>;
}) {
  const savedSuggestions: Suggestion[] = [];
  for (const suggestion of suggestions) {
    const newSuggestion: Suggestion = {
      ...suggestion,
      createdAt: new Date(),
      documentCreatedAt: new Date(),
    };
    mockSuggestions.set(suggestion.id, newSuggestion);
    savedSuggestions.push(newSuggestion);
  }
  return savedSuggestions;
}

export async function getSuggestionsByDocumentId({
  documentId,
}: { documentId: string }) {
  const suggestions = Array.from(mockSuggestions.values()).filter(
    (suggestion) => suggestion.documentId === documentId,
  );
  return suggestions;
}

// Other functions
export async function getMessageById({ id }: { id: string }) {
  return mockMessages.get(id) || null;
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  let deletedCount = 0;
  for (const [msgId, msg] of mockMessages.entries()) {
    if (msg.chatId === chatId && msg.createdAt > timestamp) {
      mockMessages.delete(msgId);
      deletedCount++;
    }
  }
  return { affectedRows: deletedCount };
}

export async function updateChatVisiblityById({
  id,
  visibility,
}: {
  id: string;
  visibility: VisibilityType;
}) {
  const chat = mockChats.get(id);
  if (chat) {
    chat.visibility = visibility;
    mockChats.set(id, chat);
    return { affectedRows: 1 };
  }
  return { affectedRows: 0 };
}

export async function getMessageCountByUserId({ userId }: { userId: string }) {
  const count = Array.from(mockMessages.values()).filter((msg) => {
    const chat = mockChats.get(msg.chatId);
    return chat && chat.userId === userId;
  }).length;
  return [{ count }];
}

export async function createStreamId({
  streamId,
  chatId,
}: { streamId: string; chatId: string }) {
  // Mock stream creation
  return { insertId: streamId };
}

export async function getStreamIdsByChatId({ chatId }: { chatId: string }) {
  // Mock stream IDs
  return [{ id: `stream-${chatId}` }];
}
