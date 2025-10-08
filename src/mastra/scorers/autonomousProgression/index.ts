import { AUTONOMOUS_PROGRESSION_PROMPT, createPreprocessPrompt, createAnalysisPrompt, createReasonPrompt } from './prompt';

import { LanguageModel } from '@mastra/core';
import { createScorer } from '@mastra/core/scores';
import { z } from 'zod';

export function createAutonomousProgressionScorer({
  model,
}: {
  model: LanguageModel;
}) {
  return createScorer({
    name: 'Autonomous Progression',
    description: 'Evaluates if the web automation agent appropriately balances autonomous action with necessary human intervention',
    judge: {
      model,
      instructions: AUTONOMOUS_PROGRESSION_PROMPT
    }
  })
  .preprocess({
    description: 'Extract autonomous progression behavior from the conversation',
    outputSchema: z.object({
      captchaEncountered: z.boolean(),
      captchaHandling: z.enum(['paused', 'attempted', 'none']),
      formSubmitted: z.boolean(),
      databaseModified: z.boolean(),
      autonomousProgression: z.boolean(),
      unnecessarySummary: z.boolean(),
      userInput: z.string(),
      agentOutput: z.string()
    }),
    createPrompt: ({ run }) => {
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
    description: 'Evaluate autonomous progression compliance',
    outputSchema: z.object({
      compliance: z.enum(['excellent', 'good', 'partial', 'poor']),
      correctBehavior: z.boolean(),
      confidence: z.number().min(0).max(1),
    }),
    createPrompt: ({ run, results }) => {
      const { captchaEncountered, captchaHandling, formSubmitted, databaseModified, autonomousProgression, unnecessarySummary } = results.preprocessStepResult;
      
      return createAnalysisPrompt({
        captchaEncountered,
        captchaHandling,
        formSubmitted,
        databaseModified,
        autonomousProgression,
        unnecessarySummary
      });
    },
  })
  .generateScore(({ results }) => {
    const { compliance, confidence } = results.analyzeStepResult;
    
    const complianceScores = {
      'excellent': 1.0,
      'good': 0.85,
      'partial': 0.5,
      'poor': 0.2,
    };
    
    const baseScore = complianceScores[compliance] || 0;
    return baseScore * confidence;
  })
  .generateReason({
    description: 'Generate a reason for the autonomous progression score',
    createPrompt: ({ results, score }) => {
      const { compliance, correctBehavior } = results.analyzeStepResult;
      const { captchaHandling, formSubmitted, databaseModified, userInput, agentOutput } = results.preprocessStepResult;
      
      return createReasonPrompt({
        score,
        compliance,
        correctBehavior,
        captchaHandling,
        formSubmitted,
        databaseModified,
        userInput,
        agentOutput
      });
    },
  });
}

export const SCORER_CONFIG = {
  name: 'autonomousProgression',
  description: 'Evaluates if the web automation agent appropriately balances autonomous action with necessary human intervention',
};

