# Experiment Testing Framework

A generic, reusable framework for running scorer tests using Mastra's `runExperiment` functionality.

## Overview

This framework provides a flexible way to test Mastra scorers against CSV-based test cases. It supports:

- ✅ **Multiple scorer types** - Works with any Mastra scorer
- ✅ **CSV-based test cases** - Easy to maintain and version control
- ✅ **Concurrent execution** - Configurable parallelism
- ✅ **Rich reporting** - JSON results with summaries by tags and metadata
- ✅ **Agent or direct evaluation** - Test with or without agents
- ✅ **Real-time progress** - See results as tests run

## Architecture

### Core Files

- **`run-experiment-tests.ts`** - Generic framework for running experiments
- **`test-*.ts`** - Specific test runner files that configure the framework

### Framework Features

The framework automatically:
- Parses CSV test cases
- Runs experiments with specified concurrency
- Tracks results in real-time
- Generates comprehensive summaries
- Saves results to timestamped JSON files
- Groups results by tags and metadata fields

## Quick Start

### 1. Create Your Test Cases CSV

Create a CSV file with your test cases:

```csv
scorer_type,id,description,input,expected_output,expected_score_min,expected_score_max,tags,enabled
myScorer,test-1,Test description,Input text,Expected output,0.8,1.0,"tag1,tag2",TRUE
myScorer,test-2,Another test,Input text 2,Expected output 2,0.5,0.7,"tag2,tag3",TRUE
```

**Required columns:**
- `scorer_type` - Type of scorer (for filtering)
- `id` - Unique test case identifier
- `description` - Human-readable test description
- `input` - Input text for the test
- `expected_output` - Expected output (or ground truth)
- `expected_score_min` - Minimum acceptable score
- `expected_score_max` - Maximum acceptable score
- `tags` - Comma-separated tags for grouping
- `enabled` - TRUE/FALSE to enable/disable test

**Optional columns:**
- `ground_truth` - Alternative ground truth field
- Any additional columns become metadata

### 2. Create a Test Runner

Create a file like `test-my-scorer.ts`:

```typescript
#!/usr/bin/env node
import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import { runExperimentTests } from './run-experiment-tests.js';
import { createMyScorer } from '../src/mastra/scorers/myScorer/index.js';
import { google } from '@ai-sdk/google';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMyTests(): Promise<void> {
  await runExperimentTests({
    scorerType: 'myScorer',
    csvPath: path.join(__dirname, '../test-cases/my-test-cases.csv'),
    scorers: [
      createMyScorer({
        model: google('gemini-2.5-pro'),
      }),
    ],
    concurrency: 3,
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runMyTests();
}

export { runMyTests };
```

### 3. Run Your Tests

```bash
# Using tsx (recommended for TypeScript)
pnpm tsx scripts/test-my-scorer.ts

# Or using node with .js extension
pnpm node scripts/test-my-scorer.js

# With parallel execution (run 3 test cases at a time)
CONCURRENCY=3 pnpm tsx scripts/test-my-scorer.ts
```

## Parallel Execution

The framework supports running multiple test cases in parallel to speed up execution:

**In Code:**
```typescript
await runExperimentTests({
  scorerType: 'myScorer',
  csvPath: './test-cases/my-test-cases.csv',
  scorers: [myScorer],
  concurrency: 5, // Run 5 tests in parallel
});
```

**Via Environment Variable:**
```bash
# Override concurrency from command line
CONCURRENCY=10 pnpm tsx scripts/test-my-scorer.ts
```

**How It Works:**
- Tests are processed in batches of size `concurrency`
- Each batch runs all tests in parallel using `Promise.all()`
- The next batch starts only after the previous batch completes
- Results are saved incrementally after each test completes
- Default is `concurrency: 1` (sequential execution)

**Choosing Concurrency:**
- **`concurrency: 1`** - Sequential, best for debugging or strict rate limits
- **`concurrency: 3-5`** - Balanced, good for most cases
- **`concurrency: 10+`** - Fast, but watch for API rate limits and token usage

**Important Notes:**
- Higher concurrency = more simultaneous API calls = faster but potentially more expensive
- Be mindful of your LLM provider's rate limits
- Console output may be interleaved when running in parallel
- Results are still saved safely and incrementally

## Configuration Options

The `runExperimentTests` function accepts a configuration object:

```typescript
interface ExperimentConfig {
  // Required
  scorerType: string;              // Type of scorer to filter test cases
  csvPath: string;                 // Path to CSV file with test cases
  scorers: MastraScorer[];         // Array of scorer instances
  
  // Optional
  target?: Agent;                  // Agent to test (if using agent-based evaluation)
  concurrency?: number;            // Number of concurrent tests (default: 1)
  outputDir?: string;              // Output directory for results (default: ../test-results)
  filterEnabled?: boolean;         // Filter by enabled column (default: true)
}
```

## Examples

### Example 1: Language Preference Scorer

```typescript
import { runExperimentTests } from './run-experiment-tests.js';
import { createLanguagePreferenceScorer } from '../src/mastra/scorers/languagePreference/index.js';
import { google } from '@ai-sdk/google';

await runExperimentTests({
  scorerType: 'languagePreference',
  csvPath: './test-cases/language-preference-test-cases.csv',
  scorers: [
    createLanguagePreferenceScorer({
      model: google('gemini-2.5-pro'),
    }),
  ],
  concurrency: 1,
});
```

### Example 2: Multiple Scorers

Test with multiple scorers at once:

```typescript
await runExperimentTests({
  scorerType: 'contentQuality',
  csvPath: './test-cases/content-test-cases.csv',
  scorers: [
    createToxicityScorer({ model }),
    createBiasScorer({ model }),
    createRelevancyScorer({ model }),
  ],
  concurrency: 2,
});
```

### Example 3: Agent-Based Testing

Test an agent with scorers:

```typescript
import { webAutomationAgent } from '../src/mastra/agents/web-automation-agent.js';

await runExperimentTests({
  scorerType: 'webAutomation',
  csvPath: './test-cases/web-automation-test-cases.csv',
  target: webAutomationAgent,
  scorers: [
    createLanguagePreferenceScorer({ model }),
    createToolAccuracyScorer({ model }),
  ],
  concurrency: 1,
});
```

### Example 4: All Test Cases

Run all test cases regardless of enabled status:

```typescript
await runExperimentTests({
  scorerType: 'myScorer',
  csvPath: './test-cases/all-test-cases.csv',
  scorers: [myScorer],
  filterEnabled: false, // Include disabled test cases
});
```

## Output Format

Results are saved as timestamped JSON files:

```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "testRun": "languagePreference-2025-01-15T10-30-00-000Z",
  "totalTests": 12,
  "results": [
    {
      "testCase": "spanish-preference-good",
      "description": "Agent changes language to Spanish",
      "score": 0.95,
      "expectedRange": "0.85-1.0",
      "passed": true,
      "reason": "Excellent compliance...",
      "tags": ["spanish", "language-change", "good"],
      "metadata": {
        "expected_compliance": "excellent"
      }
    }
  ],
  "summary": {
    "totalTests": 12,
    "passed": 10,
    "failed": 2,
    "successRate": 83.3,
    "byTag": {
      "spanish": { "passed": 8, "total": 9, "rate": "88.9" },
      "english": { "passed": 2, "total": 3, "rate": "66.7" }
    },
    "byMetadata": {
      "expected_compliance": {
        "excellent": { "passed": 5, "total": 5, "rate": "100.0" },
        "good": { "passed": 3, "total": 4, "rate": "75.0" },
        "poor": { "passed": 2, "total": 3, "rate": "66.7" }
      }
    }
  },
  "completedAt": "2025-01-15T10:35:00.000Z"
}
```

## Console Output

The framework provides rich console output:

```
════════════════════════════════════════════════════════════════════════════════
🧪 Running Experiment Tests: languagePreference
════════════════════════════════════════════════════════════════════════════════

📋 Loaded 12 test cases

🚀 Running experiments...

Testing [1/12]: spanish-preference-good
  Agent changes language to Spanish for Spanish-speaking participant
  ✅ PASS Score: 0.950 (expected: 0.85-1.0)
  Reason: Excellent compliance - agent proactively changed language...

Testing [2/12]: english-no-preference
  No language preference specified - should score well
  ✅ PASS Score: 0.900 (expected: 0.85-1.0)
  Reason: No language preference detected, appropriate default behavior...

...

════════════════════════════════════════════════════════════════════════════════
TEST SUMMARY
════════════════════════════════════════════════════════════════════════════════
Total: 12
Passed: 10
Failed: 2
Success Rate: 83.3%

────────────────────────────────────────────────────────────────────────────────
RESULTS BY TAG
────────────────────────────────────────────────────────────────────────────────
spanish: 8/9 (88.9%)
english: 2/3 (66.7%)
proactive: 2/2 (100.0%)
...

💾 Results saved to: test-results/languagePreference-2025-01-15T10-30-00-000Z.json

✅ All tests passed!
```

## Best Practices

### 1. Use Descriptive Test IDs
```csv
✅ spanish-preference-good
❌ test1
```

### 2. Tag Your Tests
Use tags to group and analyze results:
```csv
tags: "spanish,proactive,excellent"
```

### 3. Set Realistic Score Ranges
```csv
# For excellent cases
expected_score_min,expected_score_max
0.85,1.0

# For poor cases
0.0,0.3
```

### 4. Add Metadata Fields
Additional columns automatically become metadata:
```csv
...,expected_compliance,difficulty,category
...,excellent,easy,language-change
```

### 5. Control Concurrency
```typescript
// For API rate limits
concurrency: 1

// For faster execution
concurrency: 5
```

### 6. Version Control Test Cases
Keep your CSV files in version control to track test evolution.

## CI/CD Integration

Add to your CI pipeline:

```yaml
# .github/workflows/test-scorers.yml
name: Test Scorers

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - run: pnpm install
      - run: pnpm tsx scripts/test-language-preference.ts
        env:
          GOOGLE_CLOUD_PROJECT: ${{ secrets.GOOGLE_CLOUD_PROJECT }}
          # Add other secrets as needed
      
      - name: Upload results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: test-results/
```

## Troubleshooting

### Tests timing out
- Reduce `concurrency` to 1
- Check API rate limits
- Verify model availability

### CSV parsing errors
- Ensure all columns are present
- Check for unescaped commas
- Use quotes for multi-line fields

### Missing test cases
- Verify `scorer_type` matches
- Check `enabled` column is TRUE
- Ensure CSV path is correct

## Related Documentation

- [Mastra Scorers Documentation](https://docs.mastra.ai/docs/scorers/overview)
- [runExperiment API Reference](https://docs.mastra.ai/reference/scorers/run-experiment)
- [Custom Scorers Guide](https://docs.mastra.ai/docs/scorers/custom-scorers)

