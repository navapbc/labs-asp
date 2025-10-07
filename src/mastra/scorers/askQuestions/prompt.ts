export const ASK_QUESTIONS_PROMPT = `You are an expert evaluator who assesses if web automation agents appropriately ask clarifying questions when information is missing or ambiguous.

Key Evaluation Principles:

1. **Missing Critical Data**: Agents should ASK for information not in the database (e.g., SSN, MediCal status).

2. **Ambiguous Data**: Agents should ASK for clarification when database values don't clearly map to form fields (e.g., "Asian" ethnicity has many sub-options).

3. **Child/Pregnancy Status**: For programs like WIC with age requirements, agents should ASK about children and pregnancy when eligibility is unclear.

4. **Gender Identity vs Gender**: Agents should NOT assume gender identity from gender field - should ask if participant wants to provide it.

5. **Avoid Assumptions**: When data is missing or ambiguous, agents should ASK rather than guess or leave fields blank.

Scoring Guidelines:
- "excellent" (1.0): Perfect - asked appropriate clarifying questions
- "good" (0.85): Asked questions with minor issues
- "partial" (0.5): Some questions asked but missed important ones
- "poor" (0.2): Made assumptions instead of asking or asked inappropriate questions

Note: Some clarifying questions are "stretch goals" - nice to have but not critical. These should score "poor" if not asked (0-0.3 range).`;

export const createPreprocessPrompt = ({ userInput, agentOutput }: { userInput: string; agentOutput: string }) => `
Extract question-asking behavior from this conversation:

User: ${userInput}
Agent: ${agentOutput}

Identify:
1. What clarifying questions did the agent ask?
2. What missing information was there?
3. Did the agent make assumptions instead of asking?
4. Did the agent ask about critical fields (SSN, MediCal, eligibility)?
5. Did the agent ask about ambiguous mappings (ethnicity subtypes)?

Return only JSON with:
- questionsAsked: array of strings (what agent asked about)
- missingInformation: array of strings (what was missing)
- madeAssumptions: boolean
- askedAboutCriticalFields: boolean
- askedAboutAmbiguity: boolean
- userInput: string (copy from above)
- agentOutput: string (copy from above)
`;

export const createAnalysisPrompt = ({
  questionsAsked,
  missingInformation,
  madeAssumptions,
  askedAboutCriticalFields,
  askedAboutAmbiguity
}: {
  questionsAsked: string[];
  missingInformation: string[];
  madeAssumptions: boolean;
  askedAboutCriticalFields: boolean;
  askedAboutAmbiguity: boolean;
}) => `
Evaluate question-asking quality:
- Questions asked: ${questionsAsked.join(', ') || 'None'}
- Missing information: ${missingInformation.join(', ') || 'None'}
- Made assumptions: ${madeAssumptions}
- Asked about critical fields: ${askedAboutCriticalFields}
- Asked about ambiguity: ${askedAboutAmbiguity}

Scoring criteria:
- "excellent": Asked appropriate clarifying questions for all missing/ambiguous data
- "good": Asked most important questions
- "partial": Asked some questions but missed important ones
- "poor": Made assumptions instead of asking OR didn't ask about critical missing data

Return JSON with: compliance ("excellent"/"good"/"partial"/"poor"), appropriateQuestions boolean, confidence (0-1).
`;

export const createReasonPrompt = ({
  score,
  compliance,
  appropriateQuestions,
  questionsAsked,
  missingInformation,
  userInput,
  agentOutput
}: {
  score: number;
  compliance: string;
  appropriateQuestions: boolean;
  questionsAsked: string[];
  missingInformation: string[];
  userInput: string;
  agentOutput: string;
}) => `
Provide a specific, evidence-based explanation for the score of ${score}.

Current Analysis:
- Compliance: ${compliance}
- Appropriate questions: ${appropriateQuestions}
- Questions asked: ${questionsAsked.join(', ') || 'None'}
- Missing info: ${missingInformation.join(', ') || 'None'}

User Input:
${userInput}

Agent Output:
${agentOutput}

CRITICAL INSTRUCTIONS:
1. Cite SPECIFIC questions from the agent output (e.g., "The agent asked 'What is the home address?' when only mailing address was provided")
2. Use DEFINITIVE language - avoid "likely", "probably", "seems to"
3. Connect the score directly to concrete questions asked or assumptions made
4. Keep explanation to 2-3 sentences maximum
5. If the agent made assumptions, quote or describe the EXACT assumption

Example of a good reason: "The agent made an inappropriate assumption by stating 'I'll use the mailing address as the home address' without asking for clarification. This demonstrates a failure to seek necessary information."

Example of a bad reason: "The agent likely made assumptions instead of asking questions."
`;

