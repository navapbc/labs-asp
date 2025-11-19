# ASP Case Management Web Automation Bot

## Overview

The ASP (Application Support Portal) Case Management Bot is an AI-powered web automation system designed to assist caseworkers in navigating benefit application portals and gathering information for families seeking public support services.

## Purpose

This bot helps caseworkers by:
- Automatically navigating government benefit portals and websites
- Extracting relevant information from web pages
- Filling out application forms with participant data
- Researching information needed for case management
- Taking screenshots and documenting web content

## Target Audience

**Primary Users:** Social service caseworkers at government agencies and non-profit organizations helping families apply for public benefits (WIC, SNAP, Medicaid, etc.)

**Not a Public-Facing Bot:** This bot operates autonomously based on caseworker intent. Caseworkers provide high-level goals (e.g., "research eligibility requirements for WIC in California"), and the bot autonomously navigates websites, performs searches, and gathers information to fulfill those objectives. All bot activity is initiated and supervised by authenticated caseworkers through our secure web interface.

## Technical Details

### Bot Identification

- **User-Agent:** `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36`
- **Domains:**
  - Development: `dev.labs-asp.navateam.com`
  - Production: `app.labs-asp.navateam.com`
- **Verification Method:** HTTP Message Signatures (Ed25519)

### Request Signing

All web requests made by our bot are cryptographically signed using HTTP Message Signatures (RFC 9421) with Ed25519 keys. Public keys are hosted at:

**Development:**
```
https://dev.labs-asp.navateam.com/.well-known/http-message-signatures-directory
```

**Production:**
```
https://app.labs-asp.navateam.com/.well-known/http-message-signatures-directory
```

### Responsible Crawling Practices

1. **User-Directed Only:** The bot only visits websites when explicitly instructed by a caseworker
2. **Rate Limiting:** Built-in delays and throttling to avoid overwhelming target sites
3. **Respects robots.txt:** The bot honors standard web crawling conventions
4. **No Aggressive Scraping:** Sessions are interactive and human-paced
5. **Transparent Identity:** Uses verified cryptographic signatures to prove authenticity

## Technology Stack

- **Browser Automation:** Playwright (Chromium-based)
- **AI Framework:** Mastra.ai with Claude Sonnet 4.5 (Anthropic)
- **Infrastructure:** Google Cloud Platform (Cloud Run + Compute Engine)
- **Programming Language:** TypeScript/Node.js

## Contact Information

- **Organization:** Nava Public Benefit Corporation
- **Project Repository:** https://github.com/navapbc/labs-asp
- **Contact Email:**
  - General inquiries: labs@navapbc.com
  - Security/Technical: labs-asp@navapbc.com

## Privacy & Security

- All participant data is stored securely in encrypted databases
- HIPAA and privacy-compliant data handling
- Audit logging of all bot actions
- Secure authentication and authorization for caseworker access

## Rate Limits

- Max 5 concurrent browser sessions per environment
- Request timeout: 1 hour maximum for complex workflows
- Automatic throttling to prevent site overload

## Cloudflare Pay Per Crawl

This bot is registered with Cloudflare's Verified Bots program and participates in the Pay Per Crawl beta program. We use HTTP Message Signatures for authentication and respect Cloudflare's rate limiting and access controls.

---

**Last Updated:** 2025-11-18
**Bot Version:** 1.0
**Cloudflare Verified:** Yes (Signed Agent)
