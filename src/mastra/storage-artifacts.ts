import { prisma } from '../lib/prisma';
import type { PlaywrightArtifact } from './types/artifact-types';

export class ArtifactStorage {
  constructor(private prismaClient = prisma) {}

  // No longer needed - Prisma handles table creation via migrations
  async ensureTable(): Promise<void> {
    // This is now handled by Prisma migrations
    return Promise.resolve();
  }

  async storeArtifact(artifact: Omit<PlaywrightArtifact, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const result = await this.prismaClient.playwrightArtifact.create({
      data: {
        sessionId: artifact.sessionId,
        fileName: artifact.fileName,
        fileType: artifact.fileType,
        mimeType: artifact.mimeType,
        size: artifact.size,
        content: artifact.content,
        metadata: artifact.metadata,
        traceId: artifact.traceId,
        threadId: artifact.threadId,
      },
    });

    return result.id;
  }

  async getArtifact(id: string): Promise<PlaywrightArtifact | null> {
    return await this.prismaClient.playwrightArtifact.findUnique({
      where: { id },
    });
  }

  async getSessionArtifacts(sessionId: string): Promise<PlaywrightArtifact[]> {
    return await this.prismaClient.playwrightArtifact.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listArtifacts(options: {
    limit?: number;
    offset?: number;
    fileType?: string;
    sessionId?: string;
  } = {}): Promise<{ artifacts: Omit<PlaywrightArtifact, 'content'>[]; total: number }> {
    const { limit = 50, offset = 0, fileType, sessionId } = options;
    
    const where: any = {};
    if (fileType) where.fileType = fileType;
    if (sessionId) where.sessionId = sessionId;

    // Get total count
    const total = await this.prismaClient.playwrightArtifact.count({ where });

    // Get artifacts (without content for performance)
    const artifacts = await this.prismaClient.playwrightArtifact.findMany({
      where,
      select: {
        id: true,
        sessionId: true,
        fileName: true,
        fileType: true,
        mimeType: true,
        size: true,
        metadata: true,
        traceId: true,
        threadId: true,
        createdAt: true,
        updatedAt: true,
        // content: false (excluded)
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return { artifacts, total };
  }

  async deleteArtifact(id: string): Promise<boolean> {
    try {
      await this.prismaClient.playwrightArtifact.delete({
        where: { id },
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async deleteSessionArtifacts(sessionId: string): Promise<number> {
    const result = await this.prismaClient.playwrightArtifact.deleteMany({
      where: { sessionId },
    });
    return result.count;
  }
}

export const artifactStorage = new ArtifactStorage();
