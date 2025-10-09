export const DEDUCTION_PROMPT = `You are an expert evaluator who assesses if web automation agents make logical deductions and inferences from available data.

Key Evaluation Principles:

1. **Address Reuse**: If no separate mailing address exists, agents should use home address for mailing address fields.

2. **Field Mapping**: Agents should map similar database fields to form fields (e.g., "gender" → "sex", "ethnicity" → "ethnic origin").

3. **Name Variations**: Agents should search for names with and without accents (e.g., "Muñoz" and "Munoz").

4. **Proximity Deduction**: Agents should determine closest locations (WIC offices) based on home addresses.

5. **Applicant Context**: Agents should deduce if user is applying for themselves vs. someone else based on context.

6. **Reasonable Assumptions**: Agents should make logical assumptions (e.g., language preference for reading = speaking, authorization for appointments).

Scoring Guidelines:
- "excellent" (1.0): Perfect deduction - logical and correct
- "good" (0.85): Good deduction with minor issues
- "partial" (0.5): Some deduction but incomplete or questionable
- "poor" (0.2): No deduction made or incorrect deduction

Note: Some deductions are "stretch goals" - nice to have but not critical. These should score "poor" if not attempted (0-0.3 range).`;

export const createPreprocessPrompt = ({ userInput, agentOutput }: { userInput: string; agentOutput: string }) => `
Extract deduction behavior from this conversation:

User: ${userInput}
Agent: ${agentOutput}

Identify what deductions the agent made:
1. Address reuse (home → mailing)
2. Field mapping (gender → sex, ethnicity mappings)
3. Name variation searches (with/without accents)
4. Proximity calculations (closest office)
5. Applicant self-application deductions
6. Reasonable assumptions (language, authorization)

Return only JSON with:
- deductionsMade: array of strings describing what was deduced
- addressReused: boolean
- fieldMapping: boolean
- nameVariations: boolean
- proximityCalculated: boolean
- assumptionsMade: array of strings
- userInput: string (copy from above)
- agentOutput: string (copy from above)
`;

export const createAnalysisPrompt = ({
  deductionsMade,
  addressReused,
  fieldMapping,
  nameVariations,
  proximityCalculated,
  assumptionsMade
}: {
  deductionsMade: string[];
  addressReused: boolean;
  fieldMapping: boolean;
  nameVariations: boolean;
  proximityCalculated: boolean;
  assumptionsMade: string[];
}) => `
Evaluate deduction quality:
- Deductions made: ${deductionsMade.join(', ') || 'None'}
- Address reused: ${addressReused}
- Field mapping: ${fieldMapping}
- Name variations checked: ${nameVariations}
- Proximity calculated: ${proximityCalculated}
- Assumptions: ${assumptionsMade.join(', ') || 'None'}

Scoring criteria:
- "excellent": Logical deduction made correctly and appropriately
- "good": Deduction made with minor issues
- "partial": Some attempt at deduction but incomplete
- "poor": No deduction attempted or incorrect logic (especially for "stretch goal" deductions)

Return JSON with: compliance ("excellent"/"good"/"partial"/"poor"), logicalDeduction boolean, confidence (0-1).
`;

export const createReasonPrompt = ({
  score,
  compliance,
  logicalDeduction,
  deductionsMade,
  userInput,
  agentOutput
}: {
  score: number;
  compliance: string;
  logicalDeduction: boolean;
  deductionsMade: string[];
  userInput: string;
  agentOutput: string;
}) => `
Provide a specific, evidence-based explanation for the score of ${score}.

Current Analysis:
- Compliance: ${compliance}
- Logical deduction: ${logicalDeduction}
- Deductions made: ${deductionsMade.join(', ') || 'None'}

User Input:
${userInput}

Agent Output:
${agentOutput}

CRITICAL INSTRUCTIONS:
1. Cite SPECIFIC deductions from the agent output (e.g., "The agent correctly deduced the home address from the mailing address")
2. Use DEFINITIVE language - avoid "likely", "probably", "seems to"
3. Connect the score directly to concrete deductions or lack thereof
4. Keep explanation to 2-3 sentences maximum
5. If the agent made wrong assumptions, quote or describe the EXACT problematic assumption

Example of a good reason: "The agent correctly deduced that the mailing address could be reused as the home address, as shown by the statement 'Using 123 Main St for both addresses.' This demonstrates appropriate logical inference."

Example of a bad reason: "The agent likely failed to make deductions and probably asked unnecessary questions."
`;

