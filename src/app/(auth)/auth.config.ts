import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/login',
    newUser: '/',
  },
  providers: [
    // added later in auth.ts since it requires bcrypt which is only compatible with Node.js
    // while this file is also used in non-Node.js environments
  ],
  callbacks: {},
  // Add this to prevent NextAuth.js from using default pages
  useSecureCookies: false,
} satisfies NextAuthConfig;
