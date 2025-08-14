import { 
  validatePassword, 
  generateAuthToken, 
  verifyAuthToken, 
  extractTokenFromHeader, 
  createLoginPage 
} from '../auth-utils';

// Server middleware configuration extracted from index.ts
export const serverMiddleware = [
  // Login route - handles password authentication
  {
    handler: async (c: any, next: any) => {
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
          const pwdValue = formData.get('password');
          const password = typeof pwdValue === 'string' ? pwdValue : '';

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
    handler: async (c: any, next: any) => {
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
    handler: async (c: any, next: any) => {
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
];


