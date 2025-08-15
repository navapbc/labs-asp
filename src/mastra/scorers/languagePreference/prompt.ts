export const LANGUAGE_PREFERENCE_PROMPT = `You are an expert language accessibility auditor who evaluates if web automation agents properly set website language preferences for participants.

Key Principles:

1. The agent should set the website language to the participant's preferred language.
2. The agent does not need to switch to the participant's preferred language if it is not available on the website.
3. Before performing an action, the language should be set to the participant's preferred language.
`

export const languagePreferenceCheckPrompt = ({output}: {output: string}) => `See if the following output contains a language preference.
Check for:
- User stating they like to speak in a different language
- User stating they like to use a different language
- User stating English is not their first language

Example for English:
"I speak English."

Response: {
    "language": "English",
    "confidence": 0.95
}

Example for Spanish:
"I speak Spanish."
Response: {
    "language": "Spanish",
    "confidence": 0.95
}

Message to analyze:
${output}

Return the response in JSON format.
`
export const generateReasonPrompt = ({
    language,
    confidence,
  }: {
    language: string;
    confidence: number;
  }) => `Explain why the language is ${language} with a confidence of ${confidence}.
   
  Return your response in this format:
  "The language is ${language} with a confidence of ${confidence} because [explanation]"`;