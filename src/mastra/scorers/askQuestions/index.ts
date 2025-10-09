import { ASK_QUESTIONS_PROMPT, createPreprocessPrompt, createAnalysisPrompt, createReasonPrompt } from './prompt';

import { LanguageModel } from '@mastra/core';
import { createScorer } from '@mastra/core/scores';
import { z } from 'zod';

export function createAskQuestionsScorer({
  model,
}: {
  model: LanguageModel;
}) {
  return createScorer({
    name: 'Ask Questions',
    description: 'Evaluates if the web automation agent appropriately asks clarifying questions when information is missing or ambiguous',
    judge: {
      model,
      instructions: ASK_QUESTIONS_PROMPT
    }
  })
  .preprocess({
    description: 'Extract question-asking behavior from the conversation',
    outputSchema: z.object({
      questionsAsked: z.array(z.string()),
      missingInformation: z.array(z.string()),
      madeAssumptions: z.boolean(),
      askedAboutCriticalFields: z.boolean(),
      askedAboutAmbiguity: z.boolean(),
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
    description: 'Evaluate question-asking quality',
    outputSchema: z.object({
      compliance: z.enum(['excellent', 'good', 'partial', 'poor']),
      appropriateQuestions: z.boolean(),
      confidence: z.number().min(0).max(1),
    }),
    createPrompt: ({ run, results }) => {
      const { questionsAsked, missingInformation, madeAssumptions, askedAboutCriticalFields, askedAboutAmbiguity } = results.preprocessStepResult;
      
      return createAnalysisPrompt({
        questionsAsked,
        missingInformation,
        madeAssumptions,
        askedAboutCriticalFields,
        askedAboutAmbiguity
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
    description: 'Generate a reason for the question-asking score',
    createPrompt: ({ results, score }) => {
      const { compliance, appropriateQuestions } = results.analyzeStepResult;
      const { questionsAsked, missingInformation, userInput, agentOutput } = results.preprocessStepResult;
      
      return createReasonPrompt({
        score,
        compliance,
        appropriateQuestions,
        questionsAsked,
        missingInformation,
        userInput,
        agentOutput
      });
    },
  });
}

export const SCORER_CONFIG = {
  name: 'askQuestions',
  description: 'Evaluates if the web automation agent appropriately asks clarifying questions when information is missing or ambiguous',
};

