import { z } from 'zod';

const textPartSchema = z.object({
  type: z.enum(['text'], {
    errorMap: () => ({ message: 'Text part type must be "text"' }),
  }),
  text: z
    .string()
    .min(1, 'Text cannot be empty')
    .max(2000, 'Text cannot exceed 2000 characters'),
});

const filePartSchema = z.object({
  type: z.enum(['file'], {
    errorMap: () => ({ message: 'File part type must be "file"' }),
  }),
  mediaType: z.enum(['image/jpeg', 'image/png'], {
    errorMap: () => ({
      message: 'Media type must be either "image/jpeg" or "image/png"',
    }),
  }),
  name: z
    .string()
    .min(1, 'File name cannot be empty')
    .max(100, 'File name cannot exceed 100 characters'),
  url: z.string().url('File URL must be a valid URL'),
});

const partSchema = z.union([textPartSchema, filePartSchema]);

export const postRequestBodySchema = z.object({
  id: z.string().uuid('Chat ID must be a valid UUID'),
  message: z.object({
    id: z.string().uuid('Message ID must be a valid UUID'),
    role: z.enum(['user'], {
      errorMap: () => ({ message: 'Message role must be "user"' }),
    }),
    parts: z.array(partSchema).min(1, 'Message must have at least one part'),
  }),
  selectedChatModel: z.enum(['chat-model', 'chat-model-reasoning', 'mastra-web-automation'], {
    errorMap: () => ({
      message:
        'Selected chat model must be either "chat-model" or "chat-model-reasoning"',
    }),
  }),
  selectedVisibilityType: z.enum(['public', 'private'], {
    errorMap: () => ({
      message: 'Selected visibility type must be either "public" or "private"',
    }),
  }),
});

export type PostRequestBody = z.infer<typeof postRequestBodySchema>;
