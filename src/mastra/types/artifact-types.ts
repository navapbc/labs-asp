import { z } from 'zod';

// Artifact schemas for creation and manipulation
export const storeFileArtifactSchema = z.object({
  filePath: z.string().describe('Path to the file to store'),
  sessionId: z.string().describe('Session ID for grouping related artifacts'),
  fileType: z.enum(['screenshot', 'trace', 'session', 'other']).optional().default('other').describe('Type of artifact'),
  metadata: z.record(z.any()).optional().default({}).describe('Additional metadata for the artifact'),
  traceId: z.string().optional().describe('Associated trace ID'),
  threadId: z.string().optional().describe('Associated thread ID'),
});

export const getArtifactSchema = z.object({
  id: z.string().describe('Unique artifact ID'),
});

export const listArtifactsSchema = z.object({
  limit: z.number().int().min(1).max(200).optional().default(50).describe('Maximum number of artifacts to return'),
  offset: z.number().int().min(0).optional().default(0).describe('Number of artifacts to skip'),
  fileType: z.enum(['screenshot', 'trace', 'session', 'other']).optional().describe('Filter by artifact type'),
  sessionId: z.string().optional().describe('Filter by session ID'),
});

export const getSessionArtifactsSchema = z.object({
  sessionId: z.string().describe('Session ID to get artifacts for'),
});

export const deleteArtifactSchema = z.object({
  id: z.string().describe('Unique artifact ID to delete'),
});

export const deleteSessionArtifactsSchema = z.object({
  sessionId: z.string().describe('Session ID to delete all artifacts for'),
});

// Response schemas
export const artifactResponseSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  size: z.number(),
  stored: z.boolean(),
});

export const artifactDetailResponseSchema = z.object({
  artifact: z.object({
    id: z.string(),
    sessionId: z.string(),
    fileName: z.string(),
    fileType: z.string(),
    mimeType: z.string(),
    size: z.number(),
    metadata: z.record(z.any()),
    traceId: z.string().nullable(),
    threadId: z.string().nullable(),
    createdAt: z.string(),
    contentBase64: z.string(),
  }).nullable(),
});

export const artifactListResponseSchema = z.object({
  artifacts: z.array(z.object({
    id: z.string(),
    sessionId: z.string(),
    fileName: z.string(),
    fileType: z.string(),
    mimeType: z.string(),
    size: z.number(),
    metadata: z.record(z.any()),
    traceId: z.string().nullable(),
    threadId: z.string().nullable(),
    createdAt: z.string(),
  })),
  total: z.number(),
  hasMore: z.boolean(),
});

export const sessionArtifactsResponseSchema = z.object({
  artifacts: z.array(z.object({
    id: z.string(),
    fileName: z.string(),
    fileType: z.string(),
    size: z.number(),
    createdAt: z.string(),
  })),
  sessionId: z.string(),
});

export const deleteArtifactResponseSchema = z.object({
  deleted: z.boolean(),
});

export const deleteSessionArtifactsResponseSchema = z.object({
  sessionId: z.string(),
  deletedCount: z.number(),
});

// Type definitions for database model
export type PlaywrightArtifact = {
  id: string;
  sessionId: string;
  fileName: string;
  fileType: string;
  mimeType: string;
  size: number;
  content: Uint8Array; // PostgreSQL BYTEA fields as Uint8Array
  metadata: any;
  traceId: string | null;
  threadId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// Type definitions for tool inputs/outputs
export type StoreFileArtifact = z.infer<typeof storeFileArtifactSchema>;
export type GetArtifact = z.infer<typeof getArtifactSchema>;
export type ListArtifacts = z.infer<typeof listArtifactsSchema>;
export type GetSessionArtifacts = z.infer<typeof getSessionArtifactsSchema>;
export type DeleteArtifact = z.infer<typeof deleteArtifactSchema>;
export type DeleteSessionArtifacts = z.infer<typeof deleteSessionArtifactsSchema>;

// Helper function to determine MIME type
export function getMimeType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const mimeTypes: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    pdf: 'application/pdf',
    json: 'application/json',
    yml: 'text/yaml',
    yaml: 'text/yaml',
    md: 'text/markdown',
    txt: 'text/plain',
    zip: 'application/zip',
    trace: 'application/octet-stream',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

// Helper function to detect file type
export function detectFileType(fileName: string): 'screenshot' | 'trace' | 'session' | 'other' {
  const name = fileName.toLowerCase();
  
  if (name.includes('screenshot') || name.includes('page-') && (name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg'))) {
    return 'screenshot';
  }
  
  if (name.includes('trace') || name.endsWith('.trace') || name.endsWith('.zip')) {
    return 'trace';
  }
  
  if (name.includes('session') || name.endsWith('.md') || name.endsWith('.yml') || name.endsWith('.yaml')) {
    return 'session';
  }
  
  return 'other';
}
