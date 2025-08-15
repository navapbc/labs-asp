import { LANGUAGE_PREFERENCE_PROMPT, generateReasonPrompt, languagePreferenceCheckPrompt } from './prompt';

import { LanguageModel } from '@mastra/core';
import { createScorer } from '@mastra/core/scores';
import { z } from 'zod';

export function createLanguagePreferenceScorer({
    model,
}: {
    model: LanguageModel;
}) {
  return createScorer({
    name: 'Language Preference Compliance',
    description: 'Evaluates if the web automation agent changes website language to match participant language preferences',
    judge: {
      model,
      instructions: LANGUAGE_PREFERENCE_PROMPT
    }
  })
  .analyze({
    description: 'Analyze the output for language preference',
    outputSchema: z.object({
      language: z.string(),
      confidence: z.number(),
    }),
    createPrompt: ({ run }) => {
      const { output } = run;
      return languagePreferenceCheckPrompt({ output: output.text });
    },
  })
  .generateScore(({ results }) => {
    return results.analyzeStepResult.confidence;
  })
  .generateReason({
    description: 'Generate a reason for the score',
    createPrompt: ({ results }) => {
      return generateReasonPrompt({
        language: results.analyzeStepResult.language,
        confidence: results.analyzeStepResult.confidence,
      });
    },
})
}

// work in progress
function getComplianceReason(level: string, language?: string): string {
  switch (level) {
    case 'excellent':
      return `Successfully changed website language to ${language || 'participant preference'}`;
    case 'partial':
      return `Detected language change actions but may not have set the preferred language (${language})`;
    case 'poor':
      return `Failed to change website language to ${language || 'participant preference'}`;
    case 'no_preference':
      return 'No language preference specified by participant';
    default:
      return 'Language preference compliance could not be determined';
  }
}
