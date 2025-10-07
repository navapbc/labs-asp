# GitHub Actions Setup for Experiment Tests

This document explains how to set up the GitHub Actions workflow for running experiment tests with Google Sheets integration.

## Prerequisites

- Terraform setup for your GCP project
- GitHub repository with Actions enabled
- Service account `github-actions-deploy@nava-labs.iam.gserviceaccount.com` already exists

## Infrastructure Setup (Terraform)

The required infrastructure is defined in `terraform/github-actions-auth.tf`:

1. **Workload Identity Pool**: Allows GitHub Actions to authenticate to GCP
2. **OIDC Provider**: Connects GitHub's identity provider to GCP
3. **IAM Bindings**: Grants the service account appropriate permissions

### Deploy the Infrastructure

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

After applying, Terraform will output the values you need for GitHub secrets.

## GitHub Secrets Setup

Add these secrets to your repository settings:
**https://github.com/navapbc/labs-asp/settings/secrets/actions**

Get the values from Terraform outputs:

```bash
cd terraform
terraform output gcp_workload_identity_provider
terraform output gcp_service_account
terraform output github_secrets_instructions
```

**Required Secrets:**

| Secret Name | Value | Source |
|------------|-------|--------|
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | Full workload identity provider path | Terraform output |
| `GCP_SERVICE_ACCOUNT` | `github-actions-deploy@nava-labs.iam.gserviceaccount.com` | Terraform output |
| `GOOGLE_CLOUD_PROJECT` | `nava-labs` | Your GCP project ID |
| `DATABASE_URL` | PostgreSQL connection string | From `.env` file |

## Enable Google Sheets API

The workflow can fetch test cases from Google Sheets. To enable this:

1. **Enable the Sheets API:**
   ```bash
   gcloud services enable sheets.googleapis.com --project=nava-labs
   ```

2. **Grant service account access to your Sheet:**
   - Open your Google Sheet
   - Click "Share"
   - Add `github-actions-deploy@nava-labs.iam.gserviceaccount.com`
   - Set permission to "Editor" (required for writing results back to the sheet)

## Testing the Workflow

### Test with Local CSV

```yaml
scorer_type: autonomousProgression
data_source: csv
concurrency: 3
```

### Test with Google Sheets

1. Get your Google Sheet ID from the URL:
   ```
   https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit
   ```

2. Run workflow:
   ```yaml
   scorer_type: all
   data_source: google_sheet
   google_sheet_id: YOUR_SHEET_ID
   concurrency: 5
   ```

## Troubleshooting

### "Permission denied" errors

**Check Workload Identity is configured:**
```bash
gcloud iam workload-identity-pools list --location=global --project=nava-labs
```

**Verify service account bindings:**
```bash
gcloud iam service-accounts get-iam-policy \
  github-actions-deploy@nava-labs.iam.gserviceaccount.com \
  --project=nava-labs
```

### "Cannot access Google Sheet"

**Verify Sheets API is enabled:**
```bash
gcloud services list --enabled --project=nava-labs | grep sheets
```

**Check service account has Sheet access:**
- Open the Google Sheet
- Click "Share" → "Advanced"
- Verify `github-actions-deploy@nava-labs.iam.gserviceaccount.com` is listed

### GitHub Secrets not working

**Verify secrets are set:**
- Go to https://github.com/navapbc/labs-asp/settings/secrets/actions
- Confirm all required secrets exist
- Secrets should NOT have quotes around values

**Test authentication in a workflow:**
```yaml
- name: Test GCP Auth
  run: |
    gcloud auth list
    gcloud config list
```

## Architecture

```
GitHub Actions Workflow
        ↓
    (OIDC Token)
        ↓
Workload Identity Pool → GitHub Provider
        ↓
    (Impersonate)
        ↓
Service Account (github-actions-deploy)
        ↓
    (API Calls)
        ↓
Google Cloud Services (Sheets API, Vertex AI, etc.)
```

## Security

- ✅ **No service account keys stored** - Uses Workload Identity Federation
- ✅ **Repository-scoped** - Only this repo can use the identity pool
- ✅ **Least privilege** - Service account only has necessary permissions
- ✅ **Audit logs** - All API calls are logged in GCP

## Maintenance

### Updating Permissions

If the workflow needs additional GCP permissions:

1. Update `terraform/github-actions-auth.tf`
2. Add appropriate IAM roles
3. Run `terraform apply`

### Rotating Credentials

Since we use Workload Identity, there are no credentials to rotate! The OIDC tokens are short-lived and automatically managed by GitHub and GCP.

## References

- [GitHub Actions OIDC](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)
- [GCP Workload Identity Federation](https://cloud.google.com/iam/docs/workload-identity-federation)
- [Google Sheets API](https://developers.google.com/sheets/api)

