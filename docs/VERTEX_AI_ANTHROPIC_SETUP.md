# Vertex AI Anthropic Setup Guide

This guide shows how to set up Google Vertex AI with Anthropic's Claude models for your Node.js application.

## Prerequisites

- Google Cloud Platform account with billing enabled
- A GCP project
- Node.js application with the AI SDK

## Step 1: Install Dependencies

Add the required packages to your project:

```bash
pnpm add @ai-sdk/google-vertex google-auth-library
```

Your `package.json` should include these versions (or newer):

```json
{
  "dependencies": {
    "@ai-sdk/google-vertex": "^2.2.27",
    "google-auth-library": "^10.2.1"
  }
}
```

## Step 2: Configure Google Cloud

### Install and configure gcloud CLI:

```bash
# Install gcloud CLI (if not already installed)
# Follow instructions at: https://cloud.google.com/sdk/docs/install

# Set your project
gcloud config set project YOUR-PROJECT-ID

# Enable Vertex AI API
gcloud services enable aiplatform.googleapis.com

# Authenticate
gcloud auth login
gcloud auth application-default login
```

## Step 3: Enable Anthropic Models

1. Go to the [Vertex AI Model Garden](https://console.cloud.google.com/vertex-ai/model-garden)
2. Navigate to Anthropic models or use this direct link for Claude Sonnet 4: https://console.cloud.google.com/vertex-ai/publishers/anthropic/model-garden/claude-sonnet-4
3. Click "Enable" for the models you want to use
4. Complete the access request form
5. Wait 1-2 business days for approval

## Step 4: Set Environment Variables

Add these variables to your `.env` file:

```bash
# Google Vertex AI Configuration
GOOGLE_VERTEX_LOCATION=us-east5
GOOGLE_VERTEX_PROJECT=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=${PWD}/vertex-ai-credentials.json
```

Note: Use `us-east5` as the location since it has the best model availability.

## Step 5: Create Service Account Credentials

### Option A: Using Google Cloud Console

1. Go to [Google Cloud Console IAM](https://console.cloud.google.com/iam-admin/serviceaccounts)
2. Create a new service account or use an existing one
3. Add the `Vertex AI User` role
4. Generate a JSON key file
5. Save it as `vertex-ai-credentials.json` in your project root

### Option B: Using gcloud CLI

Create a service account and generate credentials using the gcloud CLI:

```bash
# Create a service account
gcloud iam service-accounts create vertex-ai \
  --display-name="Vertex AI Service Account"

# Add the Vertex AI User role
gcloud projects add-iam-policy-binding YOUR-PROJECT-ID \
  --member="serviceAccount:vertex-ai@YOUR-PROJECT-ID.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

# Generate and download the credentials JSON file
gcloud iam service-accounts keys create vertex-ai-credentials.json \
  --iam-account=vertex-ai@YOUR-PROJECT-ID.iam.gserviceaccount.com
```

Replace `YOUR-PROJECT-ID` with your actual Google Cloud project ID.

## Step 6: Use in Your Code

Import and use the Vertex AI Anthropic provider:

```typescript
import { vertexAnthropic } from '@ai-sdk/google-vertex/anthropic';

// Use in your agent or application
const model = vertexAnthropic('claude-sonnet-4@20250514');
```

## Step 7: Test the Setup

Test your configuration with a curl request:

```bash
curl -X POST \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{
    "anthropic_version": "vertex-2023-10-16",
    "messages": [
      {
        "role": "user",
        "content": "Hello"
      }
    ],
    "max_tokens": 100
  }' \
  "https://aiplatform.googleapis.com/v1/projects/YOUR-PROJECT-ID/locations/global/publishers/anthropic/models/claude-sonnet-4@20250514:streamRawPredict"
```

Replace `YOUR-PROJECT-ID` with your actual Google Cloud project ID.

## Troubleshooting

**Model not found errors**: Verify you have access to the model in the specified region and that it's enabled in Model Garden.

**Authentication errors**: Check that your service account has the correct permissions and that the credentials file path is correct.

**Quota errors**: Request quota increases in the [Cloud Console](https://console.cloud.google.com/iam-admin/quotas).

## Helpful Resources

- [Vertex AI Documentation](https://cloud.google.com/vertex-ai/docs)
- [Anthropic Claude Code Vertex AI Guide](https://docs.anthropic.com/en/docs/claude-code/google-vertex-ai)
- [AI SDK Google Vertex Documentation](https://sdk.vercel.ai/providers/ai-sdk-providers/google-vertex)
