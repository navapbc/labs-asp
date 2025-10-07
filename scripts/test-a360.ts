#!/usr/bin/env node
import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { google } from '@ai-sdk/google';
import { runExperimentTests } from './run-experiment-tests.js';
import { createLanguagePreferenceScorer } from '../src/mastra/scorers/languagePreference/index.js';
import { createAutonomousProgressionScorer } from '../src/mastra/scorers/autonomousProgression/index.js';
import { createDeductionScorer } from '../src/mastra/scorers/deduction/index.js';
import { createAskQuestionsScorer } from '../src/mastra/scorers/askQuestions/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Template substitution helper
 * Replaces {{variableName}} with actual values from the CSV row
 */
function substituteTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const normalizedKey = key.trim();
    return values[normalizedKey] || match;
  });
}

/**
 * Parse a CSV line handling quoted fields properly
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

/**
 * Preprocess the CSV to handle template substitution
 */
async function preprocessA360CSV(csvPath: string, outputPath: string): Promise<void> {
  const content = await fs.readFile(csvPath, 'utf-8');
  const lines = content.trim().split('\n');
  const headers = parseCSVLine(lines[0]);
  
  const processedLines = [headers.join(',')];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    const values = parseCSVLine(line);
    const row: Record<string, string> = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    // Only process rows with data
    if (!row.scorer_type) {
      processedLines.push(line);
      continue;
    }
    
    // Create template values map
    const templateValues: Record<string, string> = {
      'applicant-name': row['applicant-name'] || '',
      'DOB': row['DOB'] || '',
      'application-name': row['application-name'] || '',
      'application-url': row['application-url'] || '',
      'database': row['database'] || ''
    };
    
    // Substitute templates in input and expected_output
    if (row.input) {
      row.input = substituteTemplate(row.input, templateValues);
    }
    if (row.expected_output) {
      row.expected_output = substituteTemplate(row.expected_output, templateValues);
    }
    
    // Rebuild the line with proper quoting
    const newLine = headers.map(h => {
      const value = row[h] || '';
      // Quote fields that contain commas or quotes
      if (value.includes(',') || value.includes('"')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',');
    processedLines.push(newLine);
  }
  
  await fs.writeFile(outputPath, processedLines.join('\n'));
  console.log(`Preprocessed CSV saved to: ${outputPath}`);
}

/**
 * Run A360 tests for a specific scorer type
 */
async function runA360Tests(scorerType?: string): Promise<void> {
  const csvPath = path.join(__dirname, '../test-cases/a360-test-cases.csv');
  const processedCsvPath = path.join(__dirname, '../test-cases/a360-test-cases-processed.csv');
  
  // Preprocess the CSV with template substitution
  console.log('Preprocessing CSV with template substitution...');
  await preprocessA360CSV(csvPath, processedCsvPath);
  
  // Initialize model
  const model = google('gemini-2.5-pro');
  
  // Create all scorers mapped to their CSV names (snake_case)
  const scorers = {
    languagePreference: createLanguagePreferenceScorer({ model }),
    autonomous_progression: createAutonomousProgressionScorer({ model }),
    deduction: createDeductionScorer({ model }),
    askQuestions: createAskQuestionsScorer({ model })
  };
  
  // Map camelCase to snake_case for user convenience
  const scorerNameMap: Record<string, string> = {
    'languagePreference': 'languagePreference',
    'autonomousProgression': 'autonomous_progression',
    'autonomous_progression': 'autonomous_progression',
    'deduction': 'deduction',
    'askQuestions': 'askQuestions',
    'ask_questions': 'askQuestions',
  };
  
  // Determine which scorer to run
  const scorerArg = scorerType || process.argv[2];
  const scorerToRun = scorerArg ? scorerNameMap[scorerArg] || scorerArg : undefined;
  
  // Get concurrency from environment variable or default to 1
  const concurrencyLevel = parseInt(process.env.CONCURRENCY || '1', 10);
  console.log(`Using concurrency level: ${concurrencyLevel}`);
  
  if (scorerToRun && scorers[scorerToRun as keyof typeof scorers]) {
    // Run specific scorer (use the snake_case name for CSV matching)
    console.log(`Running A360 tests for: ${scorerToRun}`);
    await runExperimentTests({
      scorerType: scorerToRun, // This matches the CSV scorer_type column
      csvPath: processedCsvPath,
      scorers: [scorers[scorerToRun as keyof typeof scorers]],
      concurrency: concurrencyLevel,
      outputDir: path.join(__dirname, '../test-results'),
      filterEnabled: false, // A360 CSV doesn't have enabled column - run all tests
    });
  } else if (scorerArg === 'all') {
    // Run all scorers sequentially
    console.log('Running A360 tests for all scorers...');
    for (const [name, scorer] of Object.entries(scorers)) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`Running scorer: ${name}`);
      console.log('='.repeat(80));
      await runExperimentTests({
        scorerType: name,
        csvPath: processedCsvPath,
        scorers: [scorer],
        concurrency: concurrencyLevel,
        outputDir: path.join(__dirname, '../test-results'),
        filterEnabled: false, // A360 CSV doesn't have enabled column - run all tests
      });
    }
  } else {
    console.log('Available scorer types:');
    console.log('  - languagePreference');
    console.log('  - autonomousProgression (or autonomous_progression)');
    console.log('  - deduction');
    console.log('  - askQuestions (or ask_questions)');
    console.log('  - all (runs all scorers)');
    console.log('\nUsage: pnpm tsx scripts/test-a360.ts [scorer_type]');
    console.log('Example: pnpm tsx scripts/test-a360.ts autonomousProgression');
    console.log('Example: pnpm tsx scripts/test-a360.ts autonomous_progression');
  }
  
  // Clean up processed CSV
  try {
    await fs.unlink(processedCsvPath);
  } catch (error) {
    // Ignore cleanup errors
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runA360Tests();
}

export { runA360Tests };

