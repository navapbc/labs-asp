# A360 Scorer Setup

Complete setup for evaluating Apricot360 web automation agent behavior across 4 different dimensions.

## Created Files

### New Scorers (3)
1. **`src/mastra/scorers/autonomousProgression/`**
   - `index.ts` - Main scorer implementation
   - `prompt.ts` - Evaluation prompts

2. **`src/mastra/scorers/deduction/`**
   - `index.ts` - Main scorer implementation
   - `prompt.ts` - Evaluation prompts

3. **`src/mastra/scorers/askQuestions/`**
   - `index.ts` - Main scorer implementation
   - `prompt.ts` - Evaluation prompts

### Test Infrastructure
- **`scripts/test-a360.ts`** - Specialized test runner with template substitution
- **`test-cases/a360-test-cases.csv`** - 38 test cases across 4 scorer types
- **`test-cases/README-A360.md`** - Documentation for A360 tests

### Package Scripts
Added to `package.json`:
- `test:a360` - Show available scorer types
- `test:a360:language` - Run language preference tests (4 tests)
- `test:a360:progression` - Run autonomous progression tests (7 tests)
- `test:a360:deduction` - Run deduction tests (16 tests)
- `test:a360:questions` - Run ask questions tests (11 tests)
- `test:a360:all` - Run all scorer types sequentially

## Quick Start

```bash
# Run all tests for a specific scorer
pnpm test:a360:progression

# Run all scorer types
pnpm test:a360:all

# Show available options
pnpm test:a360
```

## Parallel Execution

Speed up test runs by processing multiple test cases simultaneously:

```bash
# Run with 3 test cases in parallel (default is 1)
CONCURRENCY=3 pnpm test:a360:progression

# Run all scorers with concurrency
CONCURRENCY=5 pnpm test:a360:all

# Higher concurrency for large test suites
CONCURRENCY=10 pnpm test:a360:deduction
```

**Notes:**
- Default concurrency is 1 (sequential)
- Higher concurrency = faster execution but more API calls
- Be mindful of API rate limits
- Results are still saved incrementally after each test completes

## Scorer Details

### 1. Autonomous Progression
**Purpose:** Evaluates if agent properly balances autonomous action with necessary pauses

**Key Behaviors:**
- ✅ Pauses at CAPTCHAs (doesn't attempt to solve)
- ✅ Fills forms but doesn't submit without approval
- ✅ Never modifies read-only database
- ✅ Progresses through pages autonomously
- ✅ Doesn't waste time summarizing every action

### 2. Deduction
**Purpose:** Evaluates if agent makes logical inferences from available data

**Key Behaviors:**
- Uses home address for mailing address if none provided
- Maps database fields to form fields (gender → sex)
- Searches names with/without accents
- Determines closest locations (WIC offices)
- Makes reasonable assumptions (language, authorization)

### 3. Ask Questions
**Purpose:** Evaluates if agent asks clarifying questions instead of making assumptions

**Key Behaviors:**
- Asks for missing critical data (SSN, MediCal status)
- Asks for clarification on ambiguous mappings (Asian → which subtype?)
- Asks about eligibility (pregnancy, children)
- Doesn't assume gender identity from gender
- Avoids making assumptions when uncertain

### 4. Language Preference (Existing)
**Purpose:** Evaluates if agent detects and acts on language preferences

**Key Behaviors:**
- Detects language preference from database
- Detects language from chat messages
- Changes website language appropriately
- Handles out-of-scope languages gracefully

## Template Substitution

The test runner automatically substitutes template variables in the CSV:

**Template in CSV:**
```
Help {{applicant-name}}, date of birth {{DOB}} apply for {{application-name}} at {{application-url}}.
```

**After Substitution:**
```
Help Rosa Flores, date of birth 1988-07-13 apply for WIC at https://www.ruhealth.org/appointments/apply-4-wic-form#.
```

## Test Results

Results are saved as timestamped JSON files in `test-results/`:

```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "testRun": "autonomousProgression-2025-01-15T10-30-00-000Z",
  "totalTests": 7,
  "results": [...],
  "summary": {
    "totalTests": 7,
    "passed": 5,
    "failed": 2,
    "successRate": 71.4,
    "byTag": {...}
  }
}
```

## Score Interpretation

- **1.0** (excellent) - Perfect compliance
- **0.85-1.0** (good) - Good compliance with minor issues
- **0.5** (partial) - Mixed compliance
- **0.2** (poor) - No compliance or incorrect behavior

**Note:** Some tests are "stretch goals" with expected scores in the 0.0-0.3 range, indicating nice-to-have but not critical behavior.

## Next Steps

1. **Test the scorers** with actual agent output
2. **Refine prompts** based on initial results
3. **Add more test cases** as new behaviors are identified
4. **Integrate with CI/CD** for automated testing

## Architecture

All scorers follow the Mastra scorer pattern:

```typescript
createScorer({
  name: 'Scorer Name',
  description: '...',
  judge: { model, instructions }
})
.preprocess({ ... })  // Extract relevant data
.analyze({ ... })     // Evaluate compliance
.generateScore({ ... }) // Calculate score
.generateReason({ ... }) // Explain score
```

This provides:
- Consistent evaluation structure
- Detailed reasoning for scores
- Easy integration with the test framework
- Clear separation of concerns

