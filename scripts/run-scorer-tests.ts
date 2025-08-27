import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createLanguagePreferenceScorer } from '../src/mastra/scorers/languagePreference/index.js';
import { vertexAnthropic } from '@ai-sdk/google-vertex/anthropic';
import { google } from '@ai-sdk/google';

// Type definitions
interface TestCase {
  id: string;
  description: string;
  input: string;
  expectedOutput: string;
  expectedCompliance: string;
  expectedScoreMin: number;
  expectedScoreMax: number;
  tags: string[];
}

interface TestResult {
  testCase: string;
  description: string;
  score: number | null;
  expectedRange: string;
  passed: boolean;
  reason: string;
  tags: string[];
  compliance: string;
}

interface CSVRow {
  [key: string]: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse CSV file
async function parseCSV(filePath: string): Promise<TestCase[]> {
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',');
  
  const testCases: TestCase[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === headers.length) {
      const testCase: CSVRow = {};
      headers.forEach((header, index) => {
        testCase[header] = values[index];
      });
      
      // Only include enabled test cases for the languagePreference scorer
      if (testCase.enabled === 'TRUE' && testCase.scorer_type === 'languagePreference') {
        testCases.push({
          id: testCase.id,
          description: testCase.description,
          input: testCase.input,
          expectedOutput: testCase.expected_output,
          expectedCompliance: testCase.expected_compliance,
          expectedScoreMin: parseFloat(testCase.expected_score_min),
          expectedScoreMax: parseFloat(testCase.expected_score_max),
          tags: testCase.tags.split(',').map(t => t.trim()),
        });
      }
    }
  }
  
  return testCases;
}

// Simple CSV parser that handles quoted fields
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

// Run scorer tests
async function runScorerTests(): Promise<void> {
  console.log('🧪 Running Language Preference Scorer Tests\n');
  
  try {
    // Load test cases
    const csvPath = path.join(__dirname, '../test-cases/language-preference-test-cases.csv');
    const testCases = await parseCSV(csvPath);
    
    console.log(`📋 Loaded ${testCases.length} test cases\n`);
    
    // Initialize scorer
    const scorer = createLanguagePreferenceScorer({
      model: google("gemini-2.5-pro"),
    });
    
    const results: TestResult[] = [];
    let passed = 0;
    let failed = 0;
    
    // Create timestamped results file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const resultsPath = path.join(__dirname, '../test-results', `language-preference-${timestamp}.json`);
    await fs.mkdir(path.dirname(resultsPath), { recursive: true });
    
    // Initialize results file with metadata
    const initialData = {
      timestamp: new Date().toISOString(),
      testRun: `language-preference-${timestamp}`,
      totalTests: testCases.length,
      results: [] as TestResult[]
    };
    await fs.writeFile(resultsPath, JSON.stringify(initialData, null, 2));
    
    for (const testCase of testCases) {
      console.log(`Testing: ${testCase.id}`);
      console.log(`${testCase.description}`);
      console.log(`Input: ${testCase.input}`);
      console.log(`Expected Output: ${testCase.expectedOutput}`);
      console.log(`Expected Score: ${testCase.expectedScoreMin} - ${testCase.expectedScoreMax}`);
      
      try {
        const result = await scorer.run({
          input: testCase.input,
          output: testCase.expectedOutput,
          runId: `test-${testCase.id}`,
        });
        
        const scoreInRange = result.score >= testCase.expectedScoreMin && 
                           result.score <= testCase.expectedScoreMax;
        
        const status = scoreInRange ? 'PASS' : 'FAIL';
        
        console.log(`${status} Score: ${result.score.toFixed(3)} (${scoreInRange ? 'within range' : 'out of range'})`);
        console.log(`Reason: ${result.reason}`);
        console.log(`Tags: ${testCase.tags.join(', ')}`);
        
        if (scoreInRange) {
          passed++;
        } else {
          failed++;
        }
        
        const testResult = {
          testCase: testCase.id,
          description: testCase.description,
          score: result.score,
          expectedRange: `${testCase.expectedScoreMin}-${testCase.expectedScoreMax}`,
          passed: scoreInRange,
          reason: result.reason || 'No reason provided',
          tags: testCase.tags,
          compliance: testCase.expectedCompliance,
        };
        
        results.push(testResult);
        
        // Append this result to the file
        const currentData = JSON.parse(await fs.readFile(resultsPath, 'utf-8'));
        currentData.results.push(testResult);
        await fs.writeFile(resultsPath, JSON.stringify(currentData, null, 2));
        
      } catch (error) {
        console.log(`ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
        failed++;
        
        const testResult = {
          testCase: testCase.id,
          description: testCase.description,
          score: null,
          expectedRange: `${testCase.expectedScoreMin}-${testCase.expectedScoreMax}`,
          passed: false,
          reason: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          tags: testCase.tags,
          compliance: testCase.expectedCompliance,
        };
        
        results.push(testResult);
        
        // Append this result to the file
        const currentData = JSON.parse(await fs.readFile(resultsPath, 'utf-8'));
        currentData.results.push(testResult);
        await fs.writeFile(resultsPath, JSON.stringify(currentData, null, 2));
      }
      
      console.log('─'.repeat(80));
    }
    
    // Generate summary
    console.log('\nTEST SUMMARY');
    console.log('═'.repeat(50));
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
    
    // Group results by compliance level
    const byCompliance = results.reduce((acc: Record<string, TestResult[]>, r) => {
      if (!acc[r.compliance]) acc[r.compliance] = [];
      acc[r.compliance].push(r);
      return acc;
    }, {});
    
    console.log('\nRESULTS BY COMPLIANCE LEVEL');
    console.log('═'.repeat(50));
    
    Object.entries(byCompliance).forEach(([compliance, cases]) => {
      const passedInGroup = cases.filter(c => c.passed).length;
      const totalInGroup = cases.length;
      const rate = ((passedInGroup / totalInGroup) * 100).toFixed(1);
      
      console.log(`\n${compliance.toUpperCase()}: ${passedInGroup}/${totalInGroup} (${rate}%)`);
      cases.forEach(c => {
        const score = c.score !== null ? c.score.toFixed(3) : 'ERROR';
        console.log(`  ${c.testCase}: ${score}`);
      });
    });
    
    // Update final summary in results file
    const currentData = JSON.parse(await fs.readFile(resultsPath, 'utf-8'));
    currentData.summary = {
      total: passed + failed,
      passed,
      failed,
      successRate: (passed / (passed + failed)) * 100
    };
    currentData.completedAt = new Date().toISOString();
    await fs.writeFile(resultsPath, JSON.stringify(currentData, null, 2));
    
    console.log(`\nResults saved to: ${resultsPath}`);
    
    // Exit with error code if any tests failed
    if (failed > 0) {
      process.exit(1);
    }
    
  } catch (error) {
    console.error('Script failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runScorerTests();
}

export { runScorerTests };
