import { Request, Response } from 'express';
import { prisma } from './lib/prisma.js';

export async function healthCheck(req: Request, res: Response) {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.ENVIRONMENT || 'unknown',
      deploymentId: process.env.DEPLOYMENT_ID || 'unknown',
      version: process.env.npm_package_version || 'unknown',
      uptime: process.uptime(),
      database: 'connected'
    };
    
    res.status(200).json(health);
  } catch (error) {
    console.error('Health check failed:', error);
    
    const health = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      environment: process.env.ENVIRONMENT || 'unknown',
      deploymentId: process.env.DEPLOYMENT_ID || 'unknown',
      version: process.env.npm_package_version || 'unknown',
      uptime: process.uptime(),
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
    
    res.status(503).json(health);
  }
}
