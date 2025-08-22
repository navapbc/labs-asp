#!/usr/bin/env node

/**
 * Simple SQL Migration Runner
 * Replaces Prisma migrations with direct SQL execution
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';
import { config } from 'dotenv';

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigrations() {
  console.log('Starting database migrations...');
  
  try {
    // Create migrations tracking table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        filename TEXT NOT NULL UNIQUE,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    
    // Get list of executed migrations
    const executedResult = await pool.query('SELECT filename FROM _migrations ORDER BY id');
    const executedMigrations = new Set(executedResult.rows.map(row => row.filename));
    
    // Get all migration files
    const migrationsDir = __dirname;
    const migrationFiles = readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    if (migrationFiles.length === 0) {
      console.log('No migration files found');
      return;
    }
    
    let executedCount = 0;
    
    for (const filename of migrationFiles) {
      if (executedMigrations.has(filename)) {
        console.log(`Skipping already executed migration: ${filename}`);
        continue;
      }
      
      console.log(`Executing migration: ${filename}`);
      
      const migrationPath = join(migrationsDir, filename);
      const migrationSQL = readFileSync(migrationPath, 'utf8');
      
      // Execute migration in a transaction
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        // Execute the migration SQL
        await client.query(migrationSQL);
        
        // Record the migration as executed
        await client.query('INSERT INTO _migrations (filename) VALUES ($1)', [filename]);
        
        await client.query('COMMIT');
        console.log(`Migration completed: ${filename}`);
        executedCount++;
        
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`Migration failed: ${filename}`);
        console.error(`Error: ${error.message}`);
        throw error;
      } finally {
        client.release();
      }
    }
    
    if (executedCount === 0) {
      console.log('All migrations already executed');
    } else {
      console.log(`Successfully executed ${executedCount} migration(s)`);
    }
    
  } catch (error) {
    console.error('Migration process failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('Database connection closed');
  }
}

// Check if this script is being run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations().catch(console.error);
}

export { runMigrations };
