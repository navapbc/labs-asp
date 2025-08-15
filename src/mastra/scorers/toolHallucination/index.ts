import { LanguageModel } from '@mastra/core';
import { createScorer } from '@mastra/core/scores';
import { google } from '@ai-sdk/google';
import { openai } from '@ai-sdk/openai';
import z from 'zod';

export function createToolHallucinationScorer({
    model
}: {
    model: LanguageModel
}) {
    return createScorer({
        name: 'Tool Hallucination',
        description: 'Check if the tool call is hallucinating',
        judge: {                    // Optional: for prompt object steps
            model,
            instructions: 'You are an expert web automation specialist who intelligently does web searches, navigates websites, queries database information, and performs multi-step web automation tasks.'
        }
        })
        // Chain step methods here
        .preprocess(({ run }) => {
            // run.input is typed as ScorerRunInputForAgent
            const userMessage = run.input.inputMessages[0]?.content;
            return { userMessage };
        })
        .analyze({
            description: 'Analyze tool call for hallucination',
            outputSchema: z.object({
            isHallucinating: z.boolean(),
            hallucinationSources: z.array(z.string()),
            confidence: z.number().min(0).max(1)
            }),
            createPrompt: ({ run, results }) => `
            Analyze this tool call for hallucination:
            "${results.preprocessStepResult.userMessage}"
            
            Look for hallucinations in the tool call.
            Return JSON with isHallucinating, hallucinationSources array, and confidence (0-1).
            `
        })
        .generateScore(({ run, results }) => {
            // run.output is typed as ScorerRunOutputForAgent  
            const response = run.output[0]?.content;
            return response.length > 10 ? 1.0 : 0.5;
        })
        // .generateReason(...)
}
