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
Extract language info from this conversation:

User: ${userInput}
Agent: ${agentOutput}

Return only JSON with: participantLanguage, languageChangeActions array, websiteLanguageSet boolean, targetLanguage.
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
Rate compliance:
- Participant wants: ${participantLanguage || 'None'}
- Actions taken: ${languageChangeActions.join(', ') || 'None'}
- Language set: ${websiteLanguageSet}
- Target: ${targetLanguage || 'None'}

Return JSON with: compliance ("excellent"/"good"/"partial"/"poor"/"no_preference"), languageMatch boolean, actionsTaken boolean, confidence (0-1).
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
Explain score ${score} in 1-2 sentences:
- Compliance: ${compliance}
- Participant wanted: ${participantLanguage || 'None'}
- Agent set: ${targetLanguage || 'None'}  
- Match: ${languageMatch}
- Action taken: ${actionsTaken}
`;