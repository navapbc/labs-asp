import { LibSQLStore } from '@mastra/libsql';
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import memoryAgent from './agents/memory-agent';
import { weatherAgent } from './agents/weather-agent';
import { weatherWorkflow } from './workflows/weather-workflow';
import { webAutomationAgent } from './agents/web-automation-agent';
import { webAutomationWorkflow } from './workflows/web-automation-workflow';
import { 
  validatePassword, 
  generateAuthToken, 
  verifyAuthToken, 
  extractTokenFromHeader, 
  createLoginPage 
} from '../auth-utils';

export const mastra = new Mastra({
  workflows: { 
    weatherWorkflow,
    webAutomationWorkflow
  },
  agents: { 
    weatherAgent,
    webAutomationAgent,
    memoryAgent,
  },
  storage: new LibSQLStore({
    url: "file:../mastra.db",
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info', // Changed from 'info' to 'debug' to capture more error details
  }),

  telemetry: {
    serviceName: 'mastra-test-app',
    enabled: true,
    sampling: {
      type: 'always_on',
    },
    export: {
      type: 'console', // Use console for development; switch to 'otlp' for production
    },
  },

  server: {
    host: '0.0.0.0', // Allow external connections
    port: 4111,
    build: {
      swaggerUI: true,     // Enable Swagger UI in production
      openAPIDocs: true,   // Enable OpenAPI docs in production
    },
    // Disabled JWT auth since we're using session-based auth for the entire playground
    // experimental_auth: new MastraJwtAuth({
    //   secret: process.env.MASTRA_JWT_SECRET!
    // }),
    middleware: [
      // Login route - handles password authentication
      {
        handler: async (c, next) => {
          const url = new URL(c.req.url);
          
          // Handle login page GET request
          if (url.pathname === '/auth/login' && c.req.method === 'GET') {
            return new Response(createLoginPage(), {
              headers: { 'Content-Type': 'text/html' }
            });
          }
          
          // Handle login form POST request
          if (url.pathname === '/auth/login' && c.req.method === 'POST') {
            try {
              const formData = await c.req.formData();
              const password = formData.get('password') as string;
              
              if (validatePassword(password)) {
                const token = generateAuthToken();
                
                // Set cookie and redirect to playground
                return new Response(null, {
                  status: 302,
                  headers: {
                    'Location': '/agents/webAutomationAgent/chat/',
                    'Set-Cookie': `mastra_token=${token}; Path=/; HttpOnly; Max-Age=86400; SameSite=Strict`
                  }
                });
              } else {
                return new Response(createLoginPage('Invalid password. Please try again.'), {
                  headers: { 'Content-Type': 'text/html' }
                });
              }
            } catch (error) {
              return new Response(createLoginPage('An error occurred. Please try again.'), {
                headers: { 'Content-Type': 'text/html' }
              });
            }
          }
          
          await next();
        },
        path: '/auth/*',
      },
      // Protection middleware for playground and API routes
      {
        handler: async (c, next) => {
          const url = new URL(c.req.url);
          
          // Allow Playground system requests to pass (telemetry/memory/etc.)
          // The Playground adds this header on its internal API calls
          const isDevPlayground = c.req.header('x-mastra-dev-playground') === 'true';
          if (isDevPlayground) {
            await next();
            return;
          }

          // Skip auth for login routes
          if (url.pathname.startsWith('/auth/')) {
            await next();
            return;
          }
          
          // Check for authentication token in cookie or header
          let token: string | null = null;
          
          // First try cookie
          const cookies = c.req.header('Cookie');
          if (cookies) {
            const tokenMatch = cookies.match(/mastra_token=([^;]+)/);
            if (tokenMatch) {
              token = tokenMatch[1];
            }
          }
          
          // Fallback to Authorization header
          if (!token) {
            token = extractTokenFromHeader(c.req.header('Authorization'));
          }
          
          // Verify token
          if (!token || !verifyAuthToken(token)) {
            return new Response(null, {
              status: 302,
              headers: { 'Location': '/auth/login' }
            });
          }
          
          await next();
        },
        path: '/*', // Protect all routes except auth
      },
      // Root redirect middleware
      {
        handler: async (c, next) => {
          const url = new URL(c.req.url);
          
          if (url.pathname === '/') {
            return new Response(null, {
              status: 302,
              headers: { 'Location': '/auth/login' }
            });
          }
          
          await next();
        },
        path: '/',
      }
    ],
  },
});
