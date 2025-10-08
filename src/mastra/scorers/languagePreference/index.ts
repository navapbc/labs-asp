import { LANGUAGE_PREFERENCE_PROMPT, createPreprocessPrompt, createAnalysisPrompt, createReasonPrompt } from './prompt';

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
  .preprocess({
    description: 'Extract language preferences and actions from the conversation',
    outputSchema: z.object({
      participantLanguage: z.string().nullable(),
      languageChangeActions: z.array(z.string()),
      websiteLanguageSet: z.boolean(),
      targetLanguage: z.string().nullable(),
      userInput: z.string(),
      agentOutput: z.string()
    }),
    createPrompt: ({ run }) => {
      // For web automation agent, the output contains the agent's actions and reasoning
      const agentOutput = Array.isArray(run.output) ? 
        run.output.map(msg => msg.content).join('\n') : 
        run.output?.text || run.output || '';
      
      const userInput = Array.isArray(run.input) ? 
        run.input.map(msg => msg.content).join('\n') : 
        run.input?.text || run.input || '';

      return createPreprocessPrompt({ userInput, agentOutput });
    },
  })
  .analyze({
    description: 'Evaluate language preference compliance',
    outputSchema: z.object({
      compliance: z.enum(['excellent', 'good', 'partial', 'poor', 'no_preference']),
      languageMatch: z.boolean(),
      actionsTaken: z.boolean(),
      confidence: z.number().min(0).max(1),
    }),
    createPrompt: ({ run, results }) => {
      const { participantLanguage, languageChangeActions, websiteLanguageSet, targetLanguage } = results.preprocessStepResult;
      
      return createAnalysisPrompt({
        participantLanguage,
        languageChangeActions,
        websiteLanguageSet,
        targetLanguage
      });
    },
  })
  .generateScore(({ results }) => {
    const { compliance, confidence } = results.analyzeStepResult;
    
    // Convert compliance level to numerical score
    const complianceScores = {
      'excellent': 1.0,
      'good': 0.8,
      'partial': 0.5,
      'poor': 0.2,
      'no_preference': 1.0 // No penalty if no preference was specified
    };
    
    const baseScore = complianceScores[compliance] || 0;
    return baseScore * confidence;
  })
  .generateReason({
    description: 'Generate a reason for the language preference compliance score',
    createPrompt: ({ results, score }) => {
      const { compliance, languageMatch, actionsTaken } = results.analyzeStepResult;
      const { participantLanguage, targetLanguage, userInput, agentOutput } = results.preprocessStepResult;
      
      return createReasonPrompt({
        score,
        compliance,
        languageMatch,
        actionsTaken,
        participantLanguage,
        targetLanguage,
        userInput,
        agentOutput
      });
    },
  });
}

export const SCORER_CONFIG = {
  name: 'languagePreference',
  description: 'Evaluates if the web automation agent changes website language to match participant language preferences',
  // sheetsId: 'your-specific-sheets-id'
};
