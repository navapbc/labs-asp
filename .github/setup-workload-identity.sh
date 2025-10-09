#!/bin/bash
# Setup Workload Identity Federation for GitHub Actions
# This allows GitHub Actions to authenticate to GCP without storing service account keys

set -e

PROJECT_ID="nava-labs"
SERVICE_ACCOUNT="github-actions-deploy@nava-labs.iam.gserviceaccount.com"
REPO_OWNER="navapbc"
REPO_NAME="labs-asp"

echo "Setting up Workload Identity Federation for GitHub Actions..."
echo "Project: $PROJECT_ID"
echo "Service Account: $SERVICE_ACCOUNT"
echo "Repository: $REPO_OWNER/$REPO_NAME"
echo ""

# 1. Create Workload Identity Pool
echo "Creating Workload Identity Pool..."
gcloud iam workload-identity-pools create "github-actions-pool" \
  --project="$PROJECT_ID" \
  --location="global" \
  --display-name="GitHub Actions Pool"

# 2. Create Workload Identity Provider
echo "Creating Workload Identity Provider..."
gcloud iam workload-identity-pools providers create-oidc "github-provider" \
  --project="$PROJECT_ID" \
  --location="global" \
  --workload-identity-pool="github-actions-pool" \
  --display-name="GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
  --attribute-condition="assertion.repository_owner == '$REPO_OWNER'" \
  --issuer-uri="https://token.actions.githubusercontent.com"

# 3. Grant Service Account permissions to the provider
echo "Binding service account to workload identity..."
gcloud iam service-accounts add-iam-policy-binding "$SERVICE_ACCOUNT" \
  --project="$PROJECT_ID" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')/locations/global/workloadIdentityPools/github-actions-pool/attribute.repository/$REPO_OWNER/$REPO_NAME"

# 4. Ensure service account has Google Sheets write access
echo "Granting Google Sheets editor access to service account..."
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/editor" \
  --condition=None

echo "Note: This grants broad 'editor' permissions. For production, consider creating a custom role with only sheets.spreadsheets.* permissions"

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Add these secrets to your GitHub repository:"
echo ""
echo "GCP_WORKLOAD_IDENTITY_PROVIDER:"
echo "projects/$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')/locations/global/workloadIdentityPools/github-actions-pool/providers/github-provider"
echo ""
echo "GCP_SERVICE_ACCOUNT:"
echo "$SERVICE_ACCOUNT"
echo ""
echo "GOOGLE_CLOUD_PROJECT:"
echo "$PROJECT_ID"
echo ""
echo "DATABASE_URL:"
echo "(Use your existing DATABASE_URL from .env)"
echo ""
echo "To add secrets, go to:"
echo "https://github.com/$REPO_OWNER/$REPO_NAME/settings/secrets/actions"

