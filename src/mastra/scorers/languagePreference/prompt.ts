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

Return only JSON with: participantLanguage, languageChangeActions array, websiteLanguageSet boolean, targetLanguage, userInput string (copy from above), agentOutput string (copy from above).
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
  targetLanguage,
  userInput,
  agentOutput
}: {
  score: number;
  compliance: string;
  languageMatch: boolean;
  actionsTaken: boolean;
  participantLanguage: string | null;
  targetLanguage: string | null;
  userInput: string;
  agentOutput: string;
}) => `
Provide a specific, evidence-based explanation for the score of ${score}.

Current Analysis:
- Compliance: ${compliance}
- Participant wanted: ${participantLanguage || 'None'}
- Agent set: ${targetLanguage || 'None'}  
- Match: ${languageMatch}
- Action taken: ${actionsTaken}

User Input:
${userInput}

Agent Output:
${agentOutput}

CRITICAL INSTRUCTIONS:
1. Cite SPECIFIC actions from the agent output (e.g., "The agent changed the website language to Spanish by selecting 'Español' from the language dropdown")
2. Use DEFINITIVE language - avoid "likely", "probably", "seems to"
3. Connect the score directly to concrete language preference actions or lack thereof
4. Keep explanation to 2-3 sentences maximum
5. If the agent failed to accommodate language preference, describe EXACTLY what was missing

Example of a good reason: "The agent correctly identified the Spanish language preference from the database and changed the website language to Spanish before proceeding with the form, as stated: 'I changed the site to Spanish and filled out the form.'"

Example of a bad reason: "The agent likely noticed the language preference and probably changed the website language."
`;