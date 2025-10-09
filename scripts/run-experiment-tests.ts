import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { runExperiment } from '@mastra/core/scores';
import type { MastraScorer } from '@mastra/core/scores';
import type { Agent } from '@mastra/core/agent';

// Generic type definitions
interface TestCase {
  id: string;
  description: string;
  input: string;
  expectedOutput?: string;
  groundTruth?: string;
  expectedScoreMin: number;
  expectedScoreMax: number;
  tags: string[];
  metadata?: Record<string, unknown>;
}

interface TestResult {
  testCase: string;
  description: string;
  score: number | null;
  expectedRange: string;
  passed: boolean;
  reason?: string;
  tags: string[];
  metadata?: Record<string, unknown>;
}

interface ExperimentConfig {
  scorerType: string;
  csvPath: string;
  scorers: MastraScorer[] | Record<string, MastraScorer>;
  target?: Agent;
  concurrency?: number;
  outputDir?: string;
  filterEnabled?: boolean;
}

interface TestSummary {
  timestamp: string;
  testRun: string;
  totalTests: number;
  passed: number;
  failed: number;
  successRate: number;
  completedAt?: string;
  byTag?: Record<string, { passed: number; total: number; rate: string }>;
  byMetadata?: Record<string, Record<string, { passed: number; total: number; rate: string }>>;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Parse CSV file with test cases
 */
async function parseTestCasesFromCSV(
  filePath: string, 
  scorerType?: string,
  filterEnabled: boolean = true
): Promise<TestCase[]> {
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  const headers = parseCSVLine(lines[0]);
  
  const testCases: TestCase[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length !== headers.length) continue;
    
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index];
    });
    
    // Filter by scorer type and enabled status if specified
    const matchesScorerType = !scorerType || row.scorer_type === scorerType;
    const isEnabled = !filterEnabled || row.enabled === 'TRUE';
    
    if (matchesScorerType && isEnabled) {
      const metadata: Record<string, unknown> = {};
      
      // Capture any additional fields as metadata
      Object.keys(row).forEach(key => {
        if (!['id', 'description', 'input', 'expected_output', 'ground_truth', 
              'expected_score_min', 'expected_score_max', 'tags', 'enabled', 
              'scorer_type'].includes(key)) {
          metadata[key] = row[key];
        }
      });
      
      testCases.push({
        id: row.id,
        description: row.description,
        input: row.input,
        expectedOutput: row.expected_output,
        groundTruth: row.ground_truth || row.expected_output,
        expectedScoreMin: parseFloat(row.expected_score_min),
        expectedScoreMax: parseFloat(row.expected_score_max),
        tags: row.tags ? row.tags.split(',').map(t => t.trim()) : [],
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      });
    }
  }
  
  return testCases;
}

/**
 * Simple CSV parser that handles quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

/**
 * Create output directory for results
 */
async function ensureOutputDir(outputDir: string): Promise<void> {
  await fs.mkdir(outputDir, { recursive: true });
}

/**
 * Generate timestamped filename for results
 */
function generateResultsFilename(prefix: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${prefix}-${timestamp}.json`;
}

/**
 * Save results to file
 */
async function saveResults(
  resultsPath: string,
  data: { 
    timestamp: string; 
    testRun: string; 
    totalTests: number; 
    results: TestResult[];
    summary?: TestSummary;
    completedAt?: string;
  }
): Promise<void> {
  await fs.writeFile(resultsPath, JSON.stringify(data, null, 2));
}

/**
 * Generate test summary statistics
 */
function generateSummary(results: TestResult[]): TestSummary {
  const passed = results.filter(r => r.passed).length;
  const failed = results.length - passed;
  
  // Group by tags
  const byTag: Record<string, { passed: number; total: number; rate: string }> = {};
  results.forEach(r => {
    r.tags.forEach(tag => {
      if (!byTag[tag]) {
        byTag[tag] = { passed: 0, total: 0, rate: '0.0' };
      }
      byTag[tag].total++;
      if (r.passed) byTag[tag].passed++;
      byTag[tag].rate = ((byTag[tag].passed / byTag[tag].total) * 100).toFixed(1);
    });
  });
  
  // Group by metadata fields if present
  const byMetadata: Record<string, Record<string, { passed: number; total: number; rate: string }>> = {};
  results.forEach(r => {
    if (r.metadata) {
      Object.entries(r.metadata).forEach(([key, value]) => {
        if (!byMetadata[key]) byMetadata[key] = {};
        const valueStr = String(value);
        if (!byMetadata[key][valueStr]) {
          byMetadata[key][valueStr] = { passed: 0, total: 0, rate: '0.0' };
        }
        byMetadata[key][valueStr].total++;
        if (r.passed) byMetadata[key][valueStr].passed++;
        byMetadata[key][valueStr].rate = ((byMetadata[key][valueStr].passed / byMetadata[key][valueStr].total) * 100).toFixed(1);
      });
    }
  });
  
  return {
    timestamp: new Date().toISOString(),
    testRun: '',
    totalTests: results.length,
    passed,
    failed,
    successRate: (passed / results.length) * 100,
    byTag,
    byMetadata: Object.keys(byMetadata).length > 0 ? byMetadata : undefined,
  };
}

/**
 * Print test summary to console
 */
function printSummary(summary: TestSummary, results: TestResult[]): void {
  console.log('\nTEST SUMMARY');
  console.log(`Total: ${summary.totalTests}`);
  console.log(`Passed: ${summary.passed}`);
  console.log(`Failed: ${summary.failed}`);
  console.log(`Success Rate: ${summary.successRate.toFixed(1)}%`);
  
  if (summary.byTag && Object.keys(summary.byTag).length > 0) {
    console.log('\nRESULTS BY TAG');
    Object.entries(summary.byTag).forEach(([tag, stats]) => {
      console.log(`  ${tag}: ${stats.passed}/${stats.total} (${stats.rate}%)`);
    });
  }
  
  if (summary.byMetadata && Object.keys(summary.byMetadata).length > 0) {
    console.log('\nRESULTS BY METADATA');
    Object.entries(summary.byMetadata).forEach(([key, values]) => {
      console.log(`${key}:`);
      Object.entries(values).forEach(([value, stats]) => {
        console.log(`  ${value}: ${stats.passed}/${stats.total} (${stats.rate}%)`);
      });
    });
  }
}

/**
 * Run experiment-based tests using Mastra's runExperiment
 * 
 * @param config Configuration object for the experiment
 * @returns Promise that resolves when tests complete
 * 
 * @example
 * ```typescript
 * import { runExperimentTests } from './scripts/run-experiment-tests';
 * import { createLanguagePreferenceScorer } from './src/mastra/scorers/languagePreference';
 * import { google } from '@ai-sdk/google';
 * 
 * await runExperimentTests({
 *   scorerType: 'languagePreference',
 *   csvPath: './test-cases/language-preference-test-cases.csv',
 *   scorers: [createLanguagePreferenceScorer({ model: google('gemini-2.5-pro') })],
 *   concurrency: 3,
 * });
 * ```
 */
export async function runExperimentTests(config: ExperimentConfig): Promise<void> {
  const {
    scorerType,
    csvPath,
    scorers,
    target,
    concurrency = 1,
    outputDir = path.join(__dirname, '../test-results'),
    filterEnabled = true,
  } = config;
  
  console.log(`Running Experiment Tests: ${scorerType}`);
  
  try {
    const testCases = await parseTestCasesFromCSV(csvPath, scorerType, filterEnabled);
    console.log(`Loaded ${testCases.length} test cases`);
    
    if (testCases.length === 0) {
      console.log('No test cases found matching criteria');
      return;
    }
    
    // Setup results tracking
    await ensureOutputDir(outputDir);
    const resultsFilename = generateResultsFilename(scorerType);
    const resultsPath = path.join(outputDir, resultsFilename);
    
    const results: TestResult[] = [];
    let itemsCompleted = 0;
    
    // Initialize results file
    const initialData = {
      timestamp: new Date().toISOString(),
      testRun: resultsFilename.replace('.json', ''),
      totalTests: testCases.length,
      results: [],
    };
    await saveResults(resultsPath, initialData);
    
    // Determine if we're using runExperiment (with agent) or direct scorer evaluation
    if (!target) {
      // Direct scorer evaluation without agent - run scorers directly with concurrency
      const scorerArray = Array.isArray(scorers) ? scorers : Object.values(scorers);
      
      // Process test cases with concurrency control
      const processTestCase = async (testCase: TestCase) => {
        const testIndex = ++itemsCompleted;
        console.log(`[${testIndex}/${testCases.length}] ${testCase.id}`);
        
        try {
          // Run each scorer
          for (const scorer of scorerArray) {
            const result = await scorer.run({
              input: testCase.input,
              output: testCase.expectedOutput || '',
              groundTruth: testCase.groundTruth,
              runId: `test-${testCase.id}`,
            }) as { score: number; reason?: string };
            
            const scoreInRange = result.score >= testCase.expectedScoreMin && 
                               result.score <= testCase.expectedScoreMax;
            
            const status = scoreInRange ? 'PASS' : 'FAIL';
            console.log(`  ${status}: ${result.score.toFixed(3)} (expected: ${testCase.expectedScoreMin}-${testCase.expectedScoreMax})`);
            if (process.env.VERBOSE && result.reason) {
              console.log(`  Reason: ${result.reason.substring(0, 100)}${result.reason.length > 100 ? '...' : ''}`);
            }
            
            const testResult: TestResult = {
              testCase: testCase.id,
              description: testCase.description,
              score: result.score,
              expectedRange: `${testCase.expectedScoreMin}-${testCase.expectedScoreMax}`,
              passed: scoreInRange,
              reason: result.reason,
              tags: testCase.tags,
              metadata: testCase.metadata,
            };
            
            results.push(testResult);
          }
          
          // Save after each test
          const currentData = JSON.parse(await fs.readFile(resultsPath, 'utf-8'));
          currentData.results = results;
          await saveResults(resultsPath, currentData);
          
        } catch (error) {
          console.log(`  ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
          
          const testResult: TestResult = {
            testCase: testCase.id,
            description: testCase.description,
            score: null,
            expectedRange: `${testCase.expectedScoreMin}-${testCase.expectedScoreMax}`,
            passed: false,
            reason: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            tags: testCase.tags,
            metadata: testCase.metadata,
          };
          
          results.push(testResult);
          
          const currentData = JSON.parse(await fs.readFile(resultsPath, 'utf-8'));
          currentData.results = results;
          await saveResults(resultsPath, currentData);
        }
      };
      
      // Run test cases with concurrency limit
      if (concurrency === 1) {
        // Sequential execution for concurrency = 1
        for (const testCase of testCases) {
          await processTestCase(testCase);
        }
      } else {
        // Parallel execution with concurrency limit
        const batches: TestCase[][] = [];
        for (let i = 0; i < testCases.length; i += concurrency) {
          batches.push(testCases.slice(i, i + concurrency));
        }
        
        for (const batch of batches) {
          await Promise.all(batch.map(processTestCase));
        }
      }
    } else {
      // Agent-based evaluation using runExperiment
      // Prepare data for runExperiment (simplified format)
      const experimentData = testCases.map(tc => ({
        input: tc.input,
        groundTruth: tc.groundTruth,
      }));
      
      // Track which test case corresponds to which data item
      const testCaseMap = new Map<number, TestCase>();
      testCases.forEach((tc, index) => {
        testCaseMap.set(index, tc);
      });
      
      const scorerArray = Array.isArray(scorers) ? scorers : Object.values(scorers);
      
      const experimentResult = await runExperiment({
        target,
        data: experimentData,
        scorers: scorerArray,
        concurrency,
        onItemComplete: ({ item, targetResult, scorerResults }) => {
          const testCase = testCases.find(tc => tc.input === item.input);
          if (!testCase) return;
          
          console.log(`[${++itemsCompleted}/${testCases.length}] ${testCase.id}`);
          
          Object.entries(scorerResults).forEach(([scorerName, result]) => {
            const scoreInRange = result.score >= testCase.expectedScoreMin && 
                               result.score <= testCase.expectedScoreMax;
            
            const status = scoreInRange ? 'PASS' : 'FAIL';
            console.log(`  ${status} ${scorerName}: ${result.score.toFixed(3)} (expected: ${testCase.expectedScoreMin}-${testCase.expectedScoreMax})`);
            
            const testResult: TestResult = {
              testCase: testCase.id,
              description: testCase.description,
              score: result.score,
              expectedRange: `${testCase.expectedScoreMin}-${testCase.expectedScoreMax}`,
              passed: scoreInRange,
              reason: result.reason,
              tags: testCase.tags,
              metadata: testCase.metadata,
            };
            
            results.push(testResult);
          });
        },
      });
      
      console.log('\nExperiment Average Scores:', JSON.stringify(experimentResult.scores, null, 2));
    }
    
    // Generate and save summary
    const summary = generateSummary(results);
    const finalData = JSON.parse(await fs.readFile(resultsPath, 'utf-8'));
    finalData.summary = summary;
    finalData.completedAt = new Date().toISOString();
    await saveResults(resultsPath, finalData);
    
    // Print summary to console
    printSummary(summary, results);
    
    console.log(`\nResults saved to: ${resultsPath}`);
    
    // Exit with error code if any tests failed
    if (summary.failed > 0) {
      console.log(`${summary.failed} test(s) failed`);
      process.exit(1);
    } else {
      console.log('All tests passed');
    }
    
  } catch (error) {
    console.error('Experiment failed:', error);
    process.exit(1);
  }
}

// Allow running as standalone script
if (import.meta.url === `file://${process.argv[1]}`) {
  console.error('This is a framework file. Import and call runExperimentTests() with your configuration.');
  console.error('\nExample usage:');
  console.error(`
import { runExperimentTests } from './scripts/run-experiment-tests.js';
import { myScorerFunction } from './src/mastra/scorers/my-scorer/index.js';

await runExperimentTests({
  scorerType: 'myScorer',
  csvPath: './test-cases/my-test-cases.csv',
  scorers: [myScorerFunction({ model: myModel })],
  concurrency: 3,
});
  `);
  process.exit(1);
}

