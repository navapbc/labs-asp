import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.MASTRA_JWT_SECRET!;
const APP_PASSWORD = process.env.MASTRA_APP_PASSWORD!;


//Validates the provided password against the configured app password
export function validatePassword(password: string): boolean {
  return password === APP_PASSWORD;
}

//Generates a JWT token for authenticated sessions
export function generateAuthToken(): string {
  return jwt.sign(
    { 
      authorized: true, 
      timestamp: Date.now(),
      // Basic payload - you can extend this as needed
    },
    JWT_SECRET,
    { 
      expiresIn: '24h' // Token expires in 24 hours
    }
  );
}

//Verifies a JWT token
export function verifyAuthToken(token: string): boolean {
  try {
    jwt.verify(token, JWT_SECRET);
    return true;
  } catch (error) {
    return false;
  }
}

//Extracts token from Authorization header
export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7); // Remove 'Bearer ' prefix
}

//Creates a simple HTML login page
export function createLoginPage(errorMessage?: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mastra Playground - Login</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0;
            padding: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .login-container {
            background: white;
            padding: 3rem;
            border-radius: 12px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            width: 100%;
            max-width: 400px;
            text-align: center;
        }
        .logo {
            font-size: 2rem;
            font-weight: bold;
            color: #333;
            margin-bottom: 0.5rem;
        }
        .subtitle {
            color: #666;
            margin-bottom: 2rem;
            font-size: 0.9rem;
        }
        .form-group {
            margin-bottom: 1.5rem;
            text-align: left;
        }
        label {
            display: block;
            margin-bottom: 0.5rem;
            color: #333;
            font-weight: 500;
        }
        input[type="password"] {
            width: 100%;
            padding: 0.75rem;
            border: 2px solid #e1e5e9;
            border-radius: 6px;
            font-size: 1rem;
            transition: border-color 0.2s;
            box-sizing: border-box;
        }
        input[type="password"]:focus {
            outline: none;
            border-color: #667eea;
        }
        .submit-btn {
            width: 100%;
            padding: 0.75rem;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 1rem;
            font-weight: 500;
            cursor: pointer;
            transition: transform 0.2s;
        }
        .submit-btn:hover {
            transform: translateY(-1px);
        }
        .error {
            background: #fee;
            border: 1px solid #fcc;
            color: #a66;
            padding: 0.75rem;
            border-radius: 6px;
            margin-bottom: 1rem;
            font-size: 0.9rem;
        }
        .info {
            margin-top: 1.5rem;
            font-size: 0.8rem;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="logo">Nava Labs ASP Bot</div>
        <div class="subtitle">Playground Access</div>

        ${errorMessage ? `<div class="error">${errorMessage}</div>` : ''}

        <form method="POST" action="/auth/login">
            <div class="form-group">
                <label for="password">Password:</label>
                <input type="password" id="password" name="password" required autocomplete="current-password">
            </div>
            <button type="submit" class="submit-btn">Access Playground</button>
        </form>

        <div class="info">
            Enter the password to access the Mastra playground interface.
        </div>
    </div>
</body>
</html>
  `;
}

