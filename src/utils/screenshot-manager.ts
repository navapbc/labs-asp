import { randomBytes } from 'crypto';

interface ScreenshotSession {
  sessionId: string;
  screenshotCount: number;
  startTime: number;
}

class ScreenshotManager {
  private sessions: Map<string, ScreenshotSession> = new Map();
  
  createSession(): string {
    const sessionId = randomBytes(4).toString('hex');
    this.sessions.set(sessionId, {
      sessionId,
      screenshotCount: 0,
      startTime: Date.now()
    });
    return sessionId;
  }
  
  generateFilename(sessionId: string, context?: string): string {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    session.screenshotCount++;
    const timestamp = Date.now();
    const contextPrefix = context ? `${context}-` : '';
    
    return `${contextPrefix}${sessionId}-${session.screenshotCount.toString().padStart(3, '0')}-${timestamp}.png`;
  }
  
  getSessionInfo(sessionId: string): ScreenshotSession | undefined {
    return this.sessions.get(sessionId);
  }
  
  listSessionScreenshots(sessionId: string): string[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];
    
    const screenshots: string[] = [];
    for (let i = 1; i <= session.screenshotCount; i++) {
      screenshots.push(`${sessionId}-${i.toString().padStart(3, '0')}`);
    }
    return screenshots;
  }
  
  cleanup(sessionId: string): void {
    this.sessions.delete(sessionId);
  }
}

// Singleton instance
export const screenshotManager = new ScreenshotManager();

// Convenience functions
export function createScreenshotSession(): string {
  return screenshotManager.createSession();
}

export function generateScreenshotFilename(sessionId: string, context?: string): string {
  return screenshotManager.generateFilename(sessionId, context);
}

export function getSessionScreenshots(sessionId: string): string[] {
  return screenshotManager.listSessionScreenshots(sessionId);
}

export function cleanupSession(sessionId: string): void {
  screenshotManager.cleanup(sessionId);
} 