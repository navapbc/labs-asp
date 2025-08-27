import {
  artifactModel,
  chatModel,
  reasoningModel,
  titleModel,
} from './models.test';
import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from 'ai';

import { isTestEnvironment } from '../constants';
import { openai } from '@ai-sdk/openai';

export const myProvider = isTestEnvironment
  ? customProvider({
      languageModels: {
        'chat-model': chatModel,
        'chat-model-reasoning': reasoningModel,
        'title-model': titleModel,
        'artifact-model': artifactModel,
        'mastra-web-automation': chatModel, // Use chat model as base, actual Mastra integration handled in route
      },
    })
  : customProvider({
      languageModels: {
        supportedUrls: {
          'image/*': [/^https:\/\/cdn\.example\.com\/.*/],
          'application/pdf': [/^https:\/\/docs\.example\.com\/.*/],
          'audio/*': [/^https:\/\/media\.example\.com\/.*/]
        },
        'chat-model': openai('gpt-4o'),
        'chat-model-reasoning': wrapLanguageModel({
          model: openai('gpt-4o'),
          middleware: extractReasoningMiddleware({ tagName: 'think' }),
        }),
        'title-model': openai('gpt-4o-mini'),
        'artifact-model': openai('gpt-4o'),
        'mastra-web-automation': openai('gpt-4o'), // Use GPT-4o as base, actual Mastra integration handled in route
      },
      imageModels: {
        'small-model': openai.imageModel('gpt-4o'),
      },
    });
