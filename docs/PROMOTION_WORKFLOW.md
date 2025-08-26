# Code Promotion Workflow

## Environment Flow
```
Feature Branch → Develop → Main
    (Preview)   →  (Dev)   → (Production)
```

## Branch Protection
- **`main`**: Protected, requires PR + approval + CI checks, no deletions
- **`develop`**: Protected, requires PR + approval + CI checks, no deletions

## Deployment Triggers

| Branch/Action | Environment | Service Name | Database |
|---------------|-------------|--------------|----------|
| `main` push | Production | `labs-asp-prod` | `database-url-production` |
| `develop` push | Development | `labs-asp-dev` | `database-url-preview` |
| PR to main/develop | Preview | `pr-{number}-labs-asp` | `database-url-preview` |
| Feature branch push | Preview | `branch-{name}-{sha}-labs-asp` | `database-url-preview` |

## Automated Release Process

### 🤖 CI-Driven Releases
1. **Push to `develop`** → Automatic release analysis
2. **Conventional Commits** determine release type:
   - `feat:` → Minor release (v1.1.0)
   - `fix:` → Patch release (v1.0.1) 
   - `BREAKING CHANGE` → Major release (v2.0.0)
3. **Auto-created PR** from `develop` to `main`
4. **Team reviews** and approves PR
5. **Merge triggers** production deployment + GitHub release

### Manual Release Commands
```bash
# Standard workflow (recommended)
git checkout develop
git commit -m "feat: add new feature"
git push origin develop
# → CI automatically creates release PR

# Manual release trigger
gh workflow run release.yml --field release_type=minor

# Emergency production deploy (skip release)
gh workflow run release.yml --field skip_release=true
```

## Development Workflow
```bash
# 1. Feature development
git checkout -b feature/my-feature
git commit -m "feat: implement feature"
git push origin feature/my-feature

# 2. Test in preview → Create PR to develop
gh pr create --base develop --title "feat: implement feature"

# 3. Merge to develop → Auto-deploys to dev environment

# 4. CI analyzes commits → Creates release PR to main

# 5. Team reviews → Approves → Auto-deploys to production
```
