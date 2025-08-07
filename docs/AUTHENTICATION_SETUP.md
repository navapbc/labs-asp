# Authentication Setup for Mastra Playground

This document explains the basic password protection implemented for the Mastra playground UI.

## Overview

The authentication system uses a simple password-based login with JWT tokens to protect access to the playground interface. This prevents unauthorized external users from accessing your playground while keeping the setup minimal and straightforward.

## Configuration

### Environment Variables

The following environment variables are required in your `.env` file:

```bash
# JWT secret for signing tokens (must be at least 32 characters)
MASTRA_JWT_SECRET=your-jwt-secret

# Simple password for playground access
MASTRA_APP_PASSWORD=123abc

# Pre-generated JWT token for API access (optional)
MASTRA_JWT_TOKEN=YOUR_JWT_TOKEN
```

### Security Considerations

- **Change the password**: Update `MASTRA_APP_PASSWORD` to a secure password before deployment
- **Change the JWT secret**: Use a strong, unique secret for `MASTRA_JWT_SECRET`
- **Regenerate tokens**: Generate new JWT tokens with your updated secret

## How It Works

1. **Route Protection**: The middleware protects all `/agents/*` routes (playground interface)
2. **Login Flow**: Users are redirected to `/auth/login` when accessing protected routes without authentication
3. **Token Management**: Successful login sets an HTTP-only cookie with a JWT token
4. **API Access**: API routes (`/api/*`) use JWT authentication for programmatic access

## Access Points

- **Playground Login**: `http://your-server:4111/auth/login`
- **Playground Interface**: `http://your-server:4111/agents/webAutomationAgent/chat/`
- **Root Redirect**: `http://your-server:4111/` → redirects to login

## Usage

### Web Browser Access

1. Navigate to your server: `http://your-server:4111`
2. You'll be redirected to the login page
3. Enter the password configured in `MASTRA_APP_PASSWORD`
4. You'll be redirected to the playground interface

### API Access

For API access, include the JWT token in the Authorization header:

```bash
curl -X POST http://your-server:4111/api/agents/weatherAgent/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"messages": "Weather in London"}'
```

## Token Management

### Generating New Tokens

You can generate new JWT tokens using Node.js:

```javascript
const jwt = require('jsonwebtoken');
const secret = 'your-jwt-secret';
const token = jwt.sign(
  { authorized: true, timestamp: Date.now() }, 
  secret, 
  { expiresIn: '24h' }
);
console.log('New token:', token);
```

### Token Expiration

- Web session tokens expire after 24 hours
- API tokens can be configured with different expiration times
- Expired tokens require re-authentication

## Security Features

- **HTTP-only cookies**: Prevents XSS attacks on web sessions
- **SameSite strict**: Prevents CSRF attacks
- **Path restrictions**: Cookies are scoped to the application path
- **Token verification**: All requests verify JWT signature and expiration

## Upgrading Security

For production use, we will consider upgrading to:

- **OAuth providers** (Google, etc.)
- **Multi-factor authentication**
- **User management system**
- **Role-based access control**

The current implementation provides a foundation that can be extended with more sophisticated authentication systems as needed.

## Troubleshooting

### Common Issues

1. **"Invalid password"**: Check that `MASTRA_APP_PASSWORD` matches your input
2. **Token errors**: Verify `MASTRA_JWT_SECRET` is set correctly
3. **Redirect loops**: Clear browser cookies and try again
4. **API access denied**: Check that your JWT token is valid and not expired

### Debugging

Enable debug logging in your Mastra configuration to see authentication flow:

```typescript
logger: new PinoLogger({
  name: 'Mastra',
  level: 'debug', // Shows authentication attempts
}),
```

## Playground telemetry/memory in development

The Mastra Playground sends `x-mastra-dev-playground: true` on its internal API calls (for example `/api/telemetry` and `/api/memory`). If you add custom auth middleware, you should allow these requests during development so the Traces and Memory tabs work.

Add a dev-only bypass in your server middleware:

```ts
// Hono middleware (Mastra server) – dev-only bypass for Playground system calls
{
  handler: async (c, next) => {
    const isDev = process.env.NODE_ENV !== 'production';
    const isPlaygroundHeader = c.req.header('x-mastra-dev-playground') === 'true';
    const url = new URL(c.req.url);
    const isInternalEndpoint =
      url.pathname.startsWith('/api/telemetry') || url.pathname.startsWith('/api/memory');

    if (isDev && isPlaygroundHeader && isInternalEndpoint) {
      await next();
      return;
    }

    // ...your existing auth...
    await next();
  },
  path: '/*',
}
```

Security notes:
- Do not rely on this header in production; any client can spoof it.
- Restrict to development and only to the internal endpoints above. Optionally also restrict to localhost.

If you still see “No traces found”, restart the dev server, send a new agent message, and verify `/api/telemetry` requests include the header and return 200.