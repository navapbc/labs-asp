import { query, getDbClient } from '../lib/db';
import type { PlaywrightArtifact } from './types/artifact-types';
import { Pool } from 'pg';
import { randomUUID } from 'crypto';

export class ArtifactStorage {
  constructor(private pool?: Pool) {}

  async ensureTable(): Promise<void> {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS mastra_artifacts (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_type TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        size INTEGER NOT NULL,
        content BYTEA NOT NULL,
        metadata JSONB DEFAULT '{}',
        trace_id TEXT,
        thread_id TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_mastra_artifacts_session_id ON mastra_artifacts(session_id);
      CREATE INDEX IF NOT EXISTS idx_mastra_artifacts_file_type ON mastra_artifacts(file_type);
      CREATE INDEX IF NOT EXISTS idx_mastra_artifacts_trace_id ON mastra_artifacts(trace_id);
      CREATE INDEX IF NOT EXISTS idx_mastra_artifacts_created_at ON mastra_artifacts(created_at);
    `;
    
    await query(createTableQuery);
  }

  async storeArtifact(artifact: Omit<PlaywrightArtifact, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = randomUUID();
    const insertQuery = `
      INSERT INTO mastra_artifacts (
        id, session_id, file_name, file_type, mime_type, size, content, metadata, trace_id, thread_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `;
    
    const result = await query(insertQuery, [
      id,
      artifact.sessionId,
      artifact.fileName,
      artifact.fileType,
      artifact.mimeType,
      artifact.size,
      artifact.content,
      artifact.metadata,
      artifact.traceId,
      artifact.threadId,
    ]);

    return result.rows[0].id;
  }

  async getArtifact(id: string): Promise<PlaywrightArtifact | null> {
    const selectQuery = `
      SELECT id, session_id as "sessionId", file_name as "fileName", file_type as "fileType", 
             mime_type as "mimeType", size, content, metadata, trace_id as "traceId", 
             thread_id as "threadId", created_at as "createdAt", updated_at as "updatedAt"
      FROM mastra_artifacts 
      WHERE id = $1
    `;
    
    const result = await query(selectQuery, [id]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async getSessionArtifacts(sessionId: string): Promise<PlaywrightArtifact[]> {
    const selectQuery = `
      SELECT id, session_id as "sessionId", file_name as "fileName", file_type as "fileType", 
             mime_type as "mimeType", size, content, metadata, trace_id as "traceId", 
             thread_id as "threadId", created_at as "createdAt", updated_at as "updatedAt"
      FROM mastra_artifacts 
      WHERE session_id = $1
      ORDER BY created_at DESC
    `;
    
    const result = await query(selectQuery, [sessionId]);
    return result.rows;
  }

  async listArtifacts(options: {
    limit?: number;
    offset?: number;
    fileType?: string;
    sessionId?: string;
  } = {}): Promise<{ artifacts: Omit<PlaywrightArtifact, 'content'>[]; total: number }> {
    const { limit = 50, offset = 0, fileType, sessionId } = options;
    
    // Build WHERE clause
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;
    
    if (fileType) {
      conditions.push(`file_type = $${paramIndex}`);
      params.push(fileType);
      paramIndex++;
    }
    if (sessionId) {
      conditions.push(`session_id = $${paramIndex}`);
      params.push(sessionId);
      paramIndex++;
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM mastra_artifacts ${whereClause}`;
    const countResult = await query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Get artifacts (without content for performance)
    const selectQuery = `
      SELECT id, session_id as "sessionId", file_name as "fileName", file_type as "fileType", 
             mime_type as "mimeType", size, metadata, trace_id as "traceId", 
             thread_id as "threadId", created_at as "createdAt", updated_at as "updatedAt"
      FROM mastra_artifacts 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    const artifacts = await query(selectQuery, [...params, limit, offset]);

    return { artifacts: artifacts.rows, total };
  }

  async deleteArtifact(id: string): Promise<boolean> {
    try {
      const deleteQuery = `DELETE FROM mastra_artifacts WHERE id = $1`;
      const result = await query(deleteQuery, [id]);
      return (result.rowCount || 0) > 0;
    } catch (error) {
      return false;
    }
  }

  async deleteSessionArtifacts(sessionId: string): Promise<number> {
    const deleteQuery = `DELETE FROM mastra_artifacts WHERE session_id = $1`;
    const result = await query(deleteQuery, [sessionId]);
    return result.rowCount || 0;
  }
}

export const artifactStorage = new ArtifactStorage();
