import fs from 'fs';
import path from 'path';
import { artifactStorage } from './storage-artifacts';

export class ArtifactWatcher {
  private watchers: fs.FSWatcher[] = [];
  private sessionId: string;
  private outputDir: string;

  constructor(outputDir: string, sessionId?: string) {
    this.outputDir = outputDir;
    this.sessionId = sessionId || `session_${Date.now()}`;
  }

  async start(): Promise<void> {
    // Ensure output directory exists
    await fs.promises.mkdir(this.outputDir, { recursive: true });

    console.log(`Starting artifact watcher for session ${this.sessionId} in ${this.outputDir}`);

    // Watch for new files in the output directory
    const watcher = fs.watch(this.outputDir, { recursive: true }, async (eventType, filename) => {
      if (eventType === 'rename' && filename) {
        const filePath = path.join(this.outputDir, filename);
        
        // Check if file exists (rename can be triggered by creation or deletion)
        try {
          const stats = await fs.promises.stat(filePath);
          if (stats.isFile()) {
            await this.handleNewFile(filePath);
          }
        } catch (error) {
          // File might have been deleted or doesn't exist yet
          console.debug(`File ${filename} not accessible:`, error);
        }
      }
    });

    this.watchers.push(watcher);

    // Also scan for existing files
    await this.scanExistingFiles();
  }

  private async scanExistingFiles(): Promise<void> {
    try {
      const files = await fs.promises.readdir(this.outputDir, { recursive: true });
      
      for (const file of files) {
        if (typeof file === 'string') {
          const filePath = path.join(this.outputDir, file);
          const stats = await fs.promises.stat(filePath);
          
          if (stats.isFile()) {
            await this.handleNewFile(filePath);
          }
        }
      }
    } catch (error) {
      console.error('Error scanning existing files:', error);
    }
  }

  private async handleNewFile(filePath: string): Promise<void> {
    try {
      // Wait a bit to ensure file is fully written
      await new Promise(resolve => setTimeout(resolve, 500));

      const fileName = path.basename(filePath);
      const content = await fs.promises.readFile(filePath);
      
      // Determine file type based on name and extension
      const fileType = this.detectFileType(fileName);
      const mimeType = this.getMimeType(fileName);

      // Extract trace and thread IDs from filename patterns
      const { traceId, threadId } = this.extractIds(fileName);

      // Store in database - ensure content is properly handled as Buffer
      const id = await artifactStorage.storeArtifact({
        sessionId: this.sessionId,
        fileName,
        fileType,
        mimeType,
        size: content.length,
        content: Buffer.isBuffer(content) ? content : Buffer.from(content),
        metadata: {
          originalPath: filePath,
          watchedAt: new Date().toISOString(),
          directory: this.outputDir,
        },
        traceId,
        threadId,
      });

      console.log(`Stored artifact ${fileName} with ID ${id} (${content.length} bytes)${traceId ? `, trace: ${traceId}` : ''}${threadId ? `, thread: ${threadId}` : ''}`);

      // Optionally remove the file after storing
      // await fs.promises.unlink(filePath);
      
    } catch (error) {
      console.error(`Error handling file ${filePath}:`, error);
    }
  }

  private detectFileType(fileName: string): 'screenshot' | 'trace' | 'session' | 'other' {
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

  private getMimeType(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
      '.json': 'application/json',
      '.yml': 'text/yaml',
      '.yaml': 'text/yaml',
      '.md': 'text/markdown',
      '.txt': 'text/plain',
      '.zip': 'application/zip',
      '.trace': 'application/octet-stream',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  private extractIds(fileName: string): { traceId: string | null; threadId: string | null } {
    let traceId: string | null = null;
    let threadId: string | null = null;

    // Extract trace ID from common Playwright patterns
    // Examples: trace-123abc.zip, trace_session_456def.trace
    const traceMatch = fileName.match(/trace[-_]?([a-fA-F0-9]{6,})/i);
    if (traceMatch) {
      traceId = traceMatch[1];
    }

    // Extract thread ID from filename patterns
    // Examples: thread-789ghi.json, session_thread_abc123.md
    const threadMatch = fileName.match(/thread[-_]?([a-fA-F0-9]{6,})/i);
    if (threadMatch) {
      threadId = threadMatch[1];
    }

    // Alternative: extract from session-based patterns
    // Examples: session_123_trace_456.zip
    if (!traceId) {
      const sessionTraceMatch = fileName.match(/session_[^_]+_trace_([a-fA-F0-9]+)/i);
      if (sessionTraceMatch) {
        traceId = sessionTraceMatch[1];
      }
    }

    return { traceId, threadId };
  }

  stop(): void {
    this.watchers.forEach(watcher => watcher.close());
    this.watchers = [];
    console.log(`Stopped artifact watcher for session ${this.sessionId}`);
  }

  getSessionId(): string {
    return this.sessionId;
  }
}

// Global watcher instance
let globalWatcher: ArtifactWatcher | null = null;

export function startArtifactWatcher(outputDir: string, sessionId?: string): ArtifactWatcher {
  if (globalWatcher) {
    globalWatcher.stop();
  }
  
  globalWatcher = new ArtifactWatcher(outputDir, sessionId);
  globalWatcher.start();
  return globalWatcher;
}

export function stopArtifactWatcher(): void {
  if (globalWatcher) {
    globalWatcher.stop();
    globalWatcher = null;
  }
}

export function getActiveWatcher(): ArtifactWatcher | null {
  return globalWatcher;
}
