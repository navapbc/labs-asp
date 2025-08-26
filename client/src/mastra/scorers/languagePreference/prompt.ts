export const LANGUAGE_PREFERENCE_PROMPT = `You are an expert language accessibility auditor who evaluates if web automation agents properly set website language preferences for participants.

Key Evaluation Principles:

1. **Language Identification**: The agent should correctly identify when a participant has a language preference different from English.

2. **Proactive Language Setting**: The agent should change the website language to match the participant's preference BEFORE filling out forms or performing other actions.

3. **Language Availability**: The agent should attempt to change the language but is not penalized if the preferred language is not available on the website.

4. **Documentation**: The agent should clearly document what language changes were attempted and whether they were successful.

5. **User Experience**: Priority should be given to ensuring the participant can understand the website content in their preferred language.

Common Language Indicators:
- Direct statements: "I speak Spanish", "My preferred language is French"
- Indirect indicators: "English is not my first language", "I need help in Chinese"
- Third-party references: "My client speaks Vietnamese", "The applicant prefers Korean"
- Cultural context: Mentions of specific cultural backgrounds that suggest language preferences

Evaluation should focus on whether the agent took appropriate action based on the language preference signals in the conversation.`

// Preprocess step prompt
export const createPreprocessPrompt = ({ userInput, agentOutput }: { userInput: string; agentOutput: string }) => `
Analyze this web automation conversation for language preferences and actions:

User Input: ${userInput}
Agent Output: ${agentOutput}

Extract:
1. What language does the participant prefer (if mentioned)?
2. What language change actions did the agent take?
3. Did the agent successfully set the website language?
4. What language was the website set to?

Return JSON with participantLanguage, languageChangeActions array, websiteLanguageSet boolean, and targetLanguage.
`;

// Analysis step prompt  
export const createAnalysisPrompt = ({ 
  participantLanguage, 
  languageChangeActions, 
  websiteLanguageSet, 
  targetLanguage 
}: {
  participantLanguage: string | null;
  languageChangeActions: string[];
  websiteLanguageSet: boolean;
  targetLanguage: string | null;
}) => `
Evaluate language preference compliance based on this analysis:

Participant Language Preference: ${participantLanguage || 'None specified'}
Language Change Actions: ${languageChangeActions.join(', ') || 'None'}
Website Language Set: ${websiteLanguageSet}
Target Language: ${targetLanguage || 'Not specified'}

Scoring criteria:
- "excellent": Agent identified participant language preference and successfully changed website language to match
- "good": Agent attempted to change language and mostly succeeded 
- "partial": Agent recognized language preference but didn't fully implement the change
- "poor": Agent failed to change language despite clear preference
- "no_preference": No language preference was specified by participant

Return JSON with compliance level, languageMatch boolean, actionsTaken boolean, and confidence (0-1).
`;

// Reason generation step prompt
export const createReasonPrompt = ({ 
  score, 
  compliance, 
  languageMatch, 
  actionsTaken, 
  participantLanguage, 
  targetLanguage 
}: {
  score: number;
  compliance: string;
  languageMatch: boolean;
  actionsTaken: boolean;
  participantLanguage: string | null;
  targetLanguage: string | null;
}) => `
Explain the language preference compliance score of ${score} based on:
- Compliance Level: ${compliance}
- Participant Language: ${participantLanguage || 'Not specified'}
- Target Language Set: ${targetLanguage || 'Not set'}
- Language Match: ${languageMatch}
- Actions Taken: ${actionsTaken}

Provide a clear explanation of why this score was assigned and what the agent did well or could improve.
`;