import { DEDUCTION_PROMPT, createPreprocessPrompt, createAnalysisPrompt, createReasonPrompt } from './prompt';

import { LanguageModel } from '@mastra/core';
import { createScorer } from '@mastra/core/scores';
import { z } from 'zod';

export function createDeductionScorer({
  model,
}: {
  model: LanguageModel;
}) {
  return createScorer({
    name: 'Deduction Quality',
    description: 'Evaluates if the web automation agent makes logical deductions and inferences from available data',
    judge: {
      model,
      instructions: DEDUCTION_PROMPT
    }
  })
  .preprocess({
    description: 'Extract deduction behavior from the conversation',
    outputSchema: z.object({
      deductionsMade: z.array(z.string()),
      addressReused: z.boolean(),
      fieldMapping: z.boolean(),
      nameVariations: z.boolean(),
      proximityCalculated: z.boolean(),
      assumptionsMade: z.array(z.string()),
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
    description: 'Evaluate deduction quality',
    outputSchema: z.object({
      compliance: z.enum(['excellent', 'good', 'partial', 'poor']),
      logicalDeduction: z.boolean(),
      confidence: z.number().min(0).max(1),
    }),
    createPrompt: ({ run, results }) => {
      const { deductionsMade, addressReused, fieldMapping, nameVariations, proximityCalculated, assumptionsMade } = results.preprocessStepResult;
      
      return createAnalysisPrompt({
        deductionsMade,
        addressReused,
        fieldMapping,
        nameVariations,
        proximityCalculated,
        assumptionsMade
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
    description: 'Generate a reason for the deduction score',
    createPrompt: ({ results, score }) => {
      const { compliance, logicalDeduction } = results.analyzeStepResult;
      const { deductionsMade, userInput, agentOutput } = results.preprocessStepResult;
      
      return createReasonPrompt({
        score,
        compliance,
        logicalDeduction,
        deductionsMade,
        userInput,
        agentOutput
      });
    },
  });
}

export const SCORER_CONFIG = {
  name: 'deduction',
  description: 'Evaluates if the web automation agent makes logical deductions and inferences from available data',
};

