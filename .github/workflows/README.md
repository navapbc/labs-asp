# GitHub Actions Workflows

## run-experiment-tests.yml

A flexible workflow for running scorer evaluation tests with multiple data sources.

### Features

- **Multiple Scorer Types**: Run tests for specific scorers or all scorers at once
- **Flexible Data Sources**: 
  - Local CSV file (from repo)
  - Google Sheets (dynamically fetched)
- **Parallel Execution**: Configure concurrency for faster test runs
- **Results Export**:
  - Automatically uploads test results as GitHub artifacts
  - When using Google Sheets: Writes results back to a new timestamped sheet in the same workbook
- **PR Integration**: Posts test summaries as comments on pull requests

### Usage

**Manual Trigger:**

1. Go to the Actions tab in GitHub
2. Select "Run Experiment Tests"
3. Click "Run workflow"
4. Configure inputs:
   - **scorer_type**: Which scorer to test (`languagePreference`, `autonomousProgression`, `deduction`, `askQuestions`, or `all`)
   - **data_source**: Where to get test cases (`csv` or `google_sheet`)
   - **google_sheet_id**: (Optional) Google Sheet ID if using `google_sheet` source
   - **concurrency**: Number of tests to run in parallel (default: 1)

**Example with Local CSV:**
```yaml
scorer_type: autonomousProgression
data_source: csv
concurrency: 3
```

**Example with Google Sheet:**
```yaml
scorer_type: all
data_source: google_sheet
google_sheet_id: 1ABC123XYZ...
concurrency: 5
```

This will download the Google Sheet, run tests, upload artifacts, and write results back to a new sheet in the same workbook.

### Google Sheets Setup

To use Google Sheets as a data source:

1. **Share the Sheet**: Make the Google Sheet editable by the service account (required for write-back)
2. **Sheet Format**: Must match the A360 CSV format with columns:
   ```
   scorer_type,id,database,applicant-name,DOB,application-name,application-url,description,input,expected_output,expected_compliance,expected_score_min,expected_score_max
   ```
3. **Get Sheet ID**: From the URL `https://docs.google.com/spreadsheets/d/SHEET_ID/edit`
4. **Results Write-back**: A new sheet will be automatically created in the workbook with timestamp

### Required Secrets

Set these in GitHub repository settings:

- `GCP_WORKLOAD_IDENTITY_PROVIDER`: GCP workload identity provider for authentication
- `GCP_SERVICE_ACCOUNT`: Service account email with Sheets API access
- `GOOGLE_CLOUD_PROJECT`: GCP project ID
- `DATABASE_URL`: PostgreSQL connection string (if needed for tests)

### Outputs

**Test Results Artifact:**
- Name: `test-results-{scorer_type}-{run_number}`
- Contains: JSON files with detailed test results
- Retention: 30 days

**Google Sheets Results (when using google_sheet data source):**
- New sheet created in the same workbook
- Sheet name: `Results_YYYYMMDD_HHMMSS`
- Contains: Test case ID, description, score, expected range, status, reason, tags, and scorer type
- Format: CSV-style table ready for stakeholder review

**PR Comment (if triggered from PR):**
- Test summary with pass/fail counts
- Success rate
- Breakdown by compliance level
- Link to full results artifact

### Implementation Details

**Data Flow:**
1. Download/copy test cases to `test-cases/a360-test-cases-ci.csv`
2. Set `A360_CSV_PATH` environment variable to point to CI CSV
3. Run test script with configured concurrency
4. Upload results as GitHub artifacts
5. (If using Google Sheets) Write results back to a new sheet in the workbook
6. Post summary comment on PR (if applicable)

**Environment Variables:**
- `A360_CSV_PATH`: Overrides the default CSV path in test scripts
- `CONCURRENCY`: Controls parallel test execution
- `GOOGLE_CLOUD_PROJECT`, `DATABASE_URL`: Required for Google AI and database access

### Local Testing

You can test the same flow locally:

```bash
# Using local CSV
pnpm test:a360:progression

# Using custom CSV path
A360_CSV_PATH=path/to/custom.csv pnpm test:a360:progression

# With concurrency
CONCURRENCY=5 pnpm test:a360:all
```

### Troubleshooting

**Google Sheets Access Denied:**
- Verify service account has "Viewer" access to the sheet
- Check workload identity provider configuration
- Ensure Sheet ID is correct

**Test Failures:**
- Check test results artifact for detailed error messages
- Verify CSV format matches expected columns
- Review individual test case reasoning in JSON results

**Authentication Errors:**
- Confirm all required secrets are set
- Verify GCP workload identity is properly configured
- Check service account has necessary API permissions (Sheets API)

