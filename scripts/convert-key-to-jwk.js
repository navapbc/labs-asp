#!/usr/bin/env node
/**
 * Convert Ed25519 public key PEM to JWK format for Cloudflare Verified Bots
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicKeyPath = path.join(__dirname, '..', 'public-key.pem');
const outputPath = path.join(__dirname, '..', 'public-key.jwk.json');

// Read the public key
const publicKeyPem = fs.readFileSync(publicKeyPath, 'utf8');

// Import the key
const publicKey = crypto.createPublicKey({
  key: publicKeyPem,
  format: 'pem',
});

// Export as JWK
const jwk = publicKey.export({ format: 'jwk' });

// Create the JWKS (JSON Web Key Set) format that Cloudflare expects
const jwks = {
  keys: [jwk]
};

// Write to file
fs.writeFileSync(outputPath, JSON.stringify(jwks, null, 2));

console.log('JWK generated successfully!');
console.log('Output: ' + outputPath);
console.log('\nJWKS Content:');
console.log(JSON.stringify(jwks, null, 2));
