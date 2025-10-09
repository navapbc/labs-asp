# A360 Test Cases

This directory contains test cases for the Apricot360 web automation agent evaluation.

## File Structure

- `a360-test-cases.csv` - Original test cases with template variables
- Test results saved to `../test-results/`

## Scorer Types

The test suite includes 4 different scorers:

### 1. Language Preference (4 tests)
Evaluates if the agent properly detects and acts on language preferences:
- Database language preference detection
- Chat language detection (Spanish prompt)
- Handling out-of-scope languages

**Run:** `pnpm test:a360:language`

### 2. Autonomous Progression (7 tests)
Evaluates if the agent balances autonomous action with necessary pauses:
- CAPTCHA handling (should pause, not attempt)
- Form submission (should pause before submitting)
- Database modification (should never modify)
- Autonomous navigation (should progress through pages)
- Avoiding unnecessary summarization

**Run:** `pnpm test:a360:progression`

### 3. Deduction (16 tests)
Evaluates if the agent makes logical deductions:
- Address reuse (home → mailing)
- Field mapping (gender → sex, ethnicity mappings)
- Name variation searches (with/without accents)
- Proximity calculations (closest WIC office)
- Reasonable assumptions

**Run:** `pnpm test:a360:deduction`

### 4. Ask Questions (11 tests)
Evaluates if the agent asks appropriate clarifying questions:
- For missing critical data (SSN, MediCal)
- For ambiguous data (Asian → which subtype?)
- About child/pregnancy eligibility
- Gender identity vs gender
- Instead of making assumptions

**Run:** `pnpm test:a360:questions`

## Template Variables

Test cases use template substitution for dynamic values:
- `{{applicant-name}}` - Replaced with name from CSV
- `{{DOB}}` - Replaced with date of birth
- `{{application-name}}` - Replaced with program name
- `{{application-url}}` - Replaced with website URL

The test runner automatically handles substitution before running tests.

## Running Tests

```bash
# Run all A360 tests (shows menu)
pnpm test:a360

# Run specific scorer type
pnpm test:a360:language
pnpm test:a360:progression
pnpm test:a360:deduction
pnpm test:a360:questions

# Run all scorer types sequentially
pnpm test:a360:all

# Enable verbose output
VERBOSE=true pnpm test:a360:language
```

## Test Case Structure

```csv
scorer_type,id,database,applicant-name,DOB,application-name,application-url,description,input,expected_output,expected_compliance,expected_score_min,expected_score_max
languagePreference,test-id,Apricot-360,Rosa Flores,1988-07-13,WIC,https://...,Description,Input with {{template}},Expected output,good,0.85,1.0
```

## Score Ranges

- **excellent**: 1.0 (perfect compliance)
- **good**: 0.85-1.0 (good compliance with minor issues)
- **partial**: 0.3-0.6 (mixed compliance)
- **poor**: 0.0-0.3 (no compliance or incorrect behavior)

Note: Some tests are "stretch goals" with poor (0.0-0.3) as the expected range, indicating nice-to-have but not critical behavior.

## Results

Test results are saved with timestamps:
```
test-results/languagePreference-2025-01-15T10-30-00-000Z.json
test-results/autonomousProgression-2025-01-15T10-35-00-000Z.json
```

Each result file includes:
- Individual test scores
- Pass/fail status
- Detailed reasons
- Summary statistics by tag and metadata

