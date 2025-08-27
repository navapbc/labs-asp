# Mastra Evals CI Specification

## Overview

Scalable GitHub Actions workflow for testing any Mastra scorer using test data from Google Sheets.

## Requirements

### Core Features
- **Multi-Scorer Support**: Test any scorer in `src/mastra/scorers/`
- **Google Sheets Integration**: Test cases sourced from Google Sheets API
- **Dynamic Discovery**: Auto-detect available scorers
- **Flexible Test Data**: Support different test case formats per scorer type

### Google Sheets Structure

**Single Sheet**: `mastra-eval-test-cases`

**Required Columns**:
- `scorer_type` - Scorer name (e.g., "languagePreference")
- `id` - Unique test case identifier
- `description` - Human readable test description
- `input` - User input to test
- `expected_output` - Expected agent response
- `expected_compliance` - Expected compliance level (varies by scorer type)
- `expected_score_min` - Minimum acceptable score
- `expected_score_max` - Maximum acceptable score
- `tags` - Comma-separated tags
- `enabled` - Boolean to enable/disable test case

**Benefits**:
- Single sheet manages all scorer types
- Easy to compare test cases across scorers
- Simplified data management

## GitHub Action Specification

### Triggers
```yaml
on:
  workflow_dispatch:
    inputs:
      scorer_types:
        description: 'Comma-separated scorer types to test (or "all")'
        required: true
        default: 'all'
      sheets_id:
        description: 'Google Sheets ID'
        required: true
```

### Environment Variables
```yaml
env:
  GOOGLE_SHEETS_API_KEY: ${{ secrets.GOOGLE_SHEETS_API_KEY }}
  VERTEX_AI_PROJECT_ID: ${{ secrets.VERTEX_AI_PROJECT_ID }}
  VERTEX_AI_CREDENTIALS: ${{ secrets.VERTEX_AI_CREDENTIALS }}
```

### Workflow Steps

1. **Discover Scorers**
   - Scan `src/mastra/scorers/` directories
   - Find scorers with `index.ts` export
   - Filter by input parameter or test all

2. **Fetch Test Data**
   - Call Google Sheets API once to get all test cases
   - Filter by `scorer_type` column for requested scorers
   - Parse sheet data into test case objects grouped by scorer type
   - Validate required fields

3. **Run Eval Tests**
   - For each scorer + test data combination
   - Execute eval tests using Vitest
   - Capture scores and reasons

4. **Generate Report**
   - Aggregate results across scorers
   - Create markdown summary
   - Upload artifacts

## Implementation Files

### Required Files
- `.github/workflows/evals-ci.yml` - Main workflow
- `scripts/discover-scorers.js` - Scorer discovery
- `scripts/fetch-sheets-data.js` - Google Sheets integration
- `scripts/generate-eval-tests.js` - Dynamic test generation

### Scorer Requirements
Each scorer must export:
```typescript
// src/mastra/scorers/{name}/index.ts
export function create{Name}Scorer(options: ScorerOptions): Scorer;
export const SCORER_CONFIG = {
  name: string;
  description: string;
  sheetsId?: string; // Optional override
};
```

## Google Sheets API Integration

### Authentication
- Service account with Sheets API access
- Credentials stored in GitHub secrets

### API Calls
```javascript
// Fetch all test cases from single sheet
GET https://sheets.googleapis.com/v4/spreadsheets/{sheetsId}/values/mastra-eval-test-cases!A:J
```

### Data Transformation
```javascript
// Convert sheets data to test case objects grouped by scorer type
const allTestCases = rows.map(row => ({
  scorerType: row[0],
  id: row[1],
  description: row[2],
  input: row[3],
  expectedOutput: row[4],
  expectedCompliance: row[5],
  expectedScoreMin: parseFloat(row[6]),
  expectedScoreMax: parseFloat(row[7]),
  tags: row[8]?.split(',').map(t => t.trim()) || [],
  enabled: row[9] === 'TRUE'
})).filter(tc => tc.enabled);

// Group by scorer type
const testCasesByScorer = allTestCases.reduce((acc, tc) => {
  if (!acc[tc.scorerType]) acc[tc.scorerType] = [];
  acc[tc.scorerType].push(tc);
  return acc;
}, {});
```

## Benefits

1. **Non-Technical Updates**: Product team can modify test cases via Google Sheets
2. **Centralized Test Data**: Single source of truth for all scorer tests
3. **Scalable**: Supports any number of scorers without code changes
4. **Collaborative**: Multiple team members can contribute test cases
5. **Version Control**: Sheets provide edit history and collaboration features

## Future Enhancements

- **Test Case Templates**: Standardized sheets templates for new scorers
- **Results Dashboard**: Web interface showing eval trends over time
- **Slack Integration**: Notifications for test failures
- **A/B Testing**: Compare scorer versions using different test sets
