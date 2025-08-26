import { createTool } from '@mastra/core/tools';
import { artifactStorage } from '../storage-artifacts';
import fs from 'fs/promises';
import path from 'path';
import {
  storeFileArtifactSchema,
  getArtifactSchema,
  listArtifactsSchema,
  getSessionArtifactsSchema,
  deleteArtifactSchema,
  deleteSessionArtifactsSchema,
  artifactResponseSchema,
  artifactDetailResponseSchema,
  artifactListResponseSchema,
  sessionArtifactsResponseSchema,
  deleteArtifactResponseSchema,
  deleteSessionArtifactsResponseSchema,
  getMimeType,
  detectFileType,
} from '../types/artifact-types';

export const storeFileArtifact = createTool({
  id: 'store-file-artifact',
  description: 'Store a file as an artifact in the database',
  inputSchema: storeFileArtifactSchema,
  outputSchema: artifactResponseSchema,
  execute: async ({ context }) => {
    try {
      const { filePath, sessionId, metadata, traceId, threadId } = context;
      let { fileType } = context;
      
      // Read file
      const content = await fs.readFile(filePath);
      const fileName = path.basename(filePath);
      const mimeType = getMimeType(fileName);
      
      // Auto-detect file type if not provided
      if (fileType === 'other') {
        fileType = detectFileType(fileName);
      }
      
      // Store in database
      const id = await artifactStorage.storeArtifact({
        sessionId,
        fileName,
        fileType,
        mimeType,
        size: content.length,
        content,
        metadata: {
          ...metadata,
          originalPath: filePath,
          storedAt: new Date().toISOString(),
        },
        traceId: traceId || null,
        threadId: threadId || null,
      });

      return {
        id,
        fileName,
        size: content.length,
        stored: true,
      };
    } catch (error) {
      throw new Error(`Failed to store artifact: ${error}`);
    }
  },
});

export const getArtifact = createTool({
  id: 'get-artifact',
  description: 'Retrieve an artifact by ID',
  inputSchema: getArtifactSchema,
  outputSchema: artifactDetailResponseSchema,
  execute: async ({ context }) => {
    const artifact = await artifactStorage.getArtifact(context.id);
    
    if (!artifact) {
      return { artifact: null };
    }

    return {
      artifact: {
        id: artifact.id,
        sessionId: artifact.sessionId,
        fileName: artifact.fileName,
        fileType: artifact.fileType,
        mimeType: artifact.mimeType,
        size: artifact.size,
        metadata: artifact.metadata,
        traceId: artifact.traceId || null,
        threadId: artifact.threadId || null,
        createdAt: artifact.createdAt.toISOString(),
        contentBase64: Buffer.from(artifact.content).toString('base64'),
      },
    };
  },
});

export const listArtifacts = createTool({
  id: 'list-artifacts',
  description: 'List artifacts with optional filtering',
  inputSchema: listArtifactsSchema,
  outputSchema: artifactListResponseSchema,
  execute: async ({ context }) => {
    const { limit, offset, fileType, sessionId } = context;
    const result = await artifactStorage.listArtifacts({
      limit,
      offset,
      fileType,
      sessionId,
    });

    return {
      artifacts: result.artifacts.map(artifact => ({
        id: artifact.id,
        sessionId: artifact.sessionId,
        fileName: artifact.fileName,
        fileType: artifact.fileType,
        mimeType: artifact.mimeType,
        size: artifact.size,
        metadata: artifact.metadata,
        traceId: artifact.traceId || null,
        threadId: artifact.threadId || null,
        createdAt: artifact.createdAt.toISOString(),
      })),
      total: result.total,
      hasMore: offset + result.artifacts.length < result.total,
    };
  },
});

export const getSessionArtifacts = createTool({
  id: 'get-session-artifacts',
  description: 'Get all artifacts for a specific session',
  inputSchema: getSessionArtifactsSchema,
  outputSchema: sessionArtifactsResponseSchema,
  execute: async ({ context }) => {
    const artifacts = await artifactStorage.getSessionArtifacts(context.sessionId);
    
    return {
      artifacts: artifacts.map(artifact => ({
        id: artifact.id,
        fileName: artifact.fileName,
        fileType: artifact.fileType,
        size: artifact.size,
        createdAt: artifact.createdAt.toISOString(),
      })),
      sessionId: context.sessionId,
    };
  },
});

export const deleteArtifact = createTool({
  id: 'delete-artifact',
  description: 'Delete an artifact by ID',
  inputSchema: deleteArtifactSchema,
  outputSchema: deleteArtifactResponseSchema,
  execute: async ({ context }) => {
    const deleted = await artifactStorage.deleteArtifact(context.id);
    return { deleted };
  },
});

export const deleteSessionArtifacts = createTool({
  id: 'delete-session-artifacts',
  description: 'Delete all artifacts for a session',
  inputSchema: deleteSessionArtifactsSchema,
  outputSchema: deleteSessionArtifactsResponseSchema,
  execute: async ({ context }) => {
    const deletedCount = await artifactStorage.deleteSessionArtifacts(context.sessionId);
    return {
      sessionId: context.sessionId,
      deletedCount,
    };
  },
});

export const artifactTools = [
  storeFileArtifact,
  getArtifact,
  listArtifacts,
  getSessionArtifacts,
  deleteArtifact,
  deleteSessionArtifacts,
];
