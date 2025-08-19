# GitHub CI/CD Setup Guide

## Overview

After pushing your code, you need to configure GitHub secrets to enable the automated deployment pipeline.

## 🔐 Required GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret

### 1. GCP_PROJECT_ID
```
your-gcp-project-id
```

### 2. GCP_SA_KEY
You need to create a service account for GitHub Actions:

```bash
# Create service account
gcloud iam service-accounts create github-actions \
    --display-name="GitHub Actions" \
    --project=YOUR_PROJECT_ID

# Grant necessary permissions
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/run.admin"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/storage.admin"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/artifactregistry.admin"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/iam.serviceAccountUser"

# Create and download key
gcloud iam service-accounts keys create github-actions-key.json \
    --iam-account=github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com

# Copy the entire contents of github-actions-key.json as the GCP_SA_KEY secret
cat github-actions-key.json
```

## 🚀 How the CI/CD Pipeline Works

### Branch-Based Deployments

1. **Feature Branches** → Preview deployments
   - Each branch gets: `https://branch-name-labs-asp.run.app`
   - Isolated environment with separate database schema
   - Automatic cleanup when branch is deleted

2. **Pull Requests** → Preview deployments with PR comments
   - Each PR gets: `https://pr-123-labs-asp.run.app` 
   - GitHub bot comments with deployment URL
   - Automatic cleanup when PR is closed

3. **Main Branch** → Production deployment
   - Deploys to: `https://labs-asp-main.run.app`
   - Uses production database and resources
   - Zero-downtime blue-green deployment

### Workflow Files

Your repository now has these GitHub Actions:

#### `.github/workflows/ci.yml`
- Runs on every push and PR
- Type checking, linting, testing
- Builds Docker container
- Fast feedback loop (~3-5 minutes)

#### `.github/workflows/deploy.yml`
- Deploys to Cloud Run based on branch
- Creates preview environments
- Updates PR comments with deployment URLs
- Handles cleanup when PRs are closed

#### `.github/workflows/cleanup.yml`
- Runs daily to clean up old deployments
- Removes container images older than 30 days
- Keeps costs under control

## 🌐 Webhook-Triggered Deployments

Once you merge your PR to main, here's what happens automatically:

### 1. Push to Main
```bash
git checkout main
git merge fg/setup-terraform-deployment
git push origin main
```

### 2. GitHub Actions Triggers
- CI workflow runs (build, test, type-check)
- Deploy workflow runs in parallel
- Builds container and pushes to Artifact Registry
- Deploys to Cloud Run production service

### 3. Zero-Downtime Deployment
- New container revision is created
- Traffic gradually shifts to new revision
- Old revision is kept for instant rollback
- Health checks ensure stability

### 4. Notification
- GitHub shows deployment status
- Cloud Run URL is updated
- Logs are available in GitHub Actions

## 🔄 Preview Environment Workflow

### Creating a Preview
```bash
# Create feature branch
git checkout -b feature/my-new-feature

# Make changes and push
git add .
git commit -m "feat: add new feature"
git push origin feature/my-new-feature

# Create PR on GitHub
# → Automatic preview deployment created
# → GitHub bot comments with URL
```

### Preview Environment Features
- **Unique URL**: `https://feature-my-new-feature-labs-asp.run.app`
- **Isolated Database**: Separate schema for testing
- **Full Browser Pool**: Complete browser-in-browser functionality
- **Same Architecture**: Identical to production setup

### Cleanup
- **Branch deletion** → Preview environment deleted
- **PR closure** → Preview environment deleted
- **Daily cleanup** → Old deployments removed

## 🛠️ Manual Deployment (If Needed)

If you want to deploy manually instead of using webhooks:

```bash
# Deploy infrastructure first
./scripts/deploy-infrastructure.sh

# Then deploy your app
./scripts/deploy-app.sh
```

## 🔍 Monitoring Deployments

### GitHub Actions
- Go to your repo → Actions tab
- See all workflow runs and their status
- Click on any run to see detailed logs

### Cloud Run Console
- Visit [Cloud Run Console](https://console.cloud.google.com/run)
- See all your services and their status
- Monitor traffic, errors, and performance

### Logs
```bash
# View Cloud Run logs
gcloud run services logs read labs-asp-main --region=us-central1

# View GitHub Actions logs
# Available in the GitHub Actions tab
```

## 🚨 Troubleshooting

### Common Issues

1. **"Permission denied" in GitHub Actions**
   - Check GCP_SA_KEY secret is correct JSON
   - Verify service account has required permissions

2. **"Service not found" during deployment**
   - Make sure Terraform infrastructure is deployed first
   - Check that the service was created in the right region

3. **Container build fails**
   - Check Dockerfile syntax
   - Verify all dependencies are in package.json
   - Look at build logs in GitHub Actions

4. **Database connection fails**
   - Ensure VPC connector is created
   - Check that secrets are properly configured
   - Verify database instance is running

### Getting Help

- **GitHub Actions logs**: Detailed error messages
- **Cloud Run logs**: Runtime errors and application logs  
- **Terraform state**: `terraform show` to see current infrastructure
- **Manual testing**: Use `./scripts/deploy-app.sh` to test locally

## ✅ Next Steps

1. **Merge your PR** to enable production deployments
2. **Test preview environments** by creating feature branches
3. **Monitor the deployment** in GitHub Actions and Cloud Run
4. **Set up custom domains** if needed
5. **Configure monitoring and alerts**

Your infrastructure is now fully automated with webhook-triggered deployments! 🎉
