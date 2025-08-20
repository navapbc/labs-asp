# GitHub Templates & Workflows

This directory contains GitHub-specific configuration files for the labs-asp-experiments repository.

## Templates

### Pull Request Template
- **File**: `pull_request_template.md`
- **Purpose**: Ensures PRs follow conventional commit standards and include necessary information
- **Features**: 
  - Conventional commit format validation
  - Structured sections for tickets, changes, and context
  - References to best practices

### Issue Templates
Located in `ISSUE_TEMPLATE/`:

1. **Bug Report** (`bug_report.yml`)
   - Structured form for reporting bugs
   - Project-specific dropdowns
   - Required fields for reproduction steps

2. **Feature Request** (`feature_request.yml`)
   - Template for suggesting new features
   - Project targeting options
   - Solution and alternative descriptions

3. **Experiment Proposal** (`experiment_proposal.yml`)
   - ASP-specific template for proposing new experiments
   - Hypothesis and methodology sections
   - Success criteria and complexity estimation

4. **Config** (`config.yml`)
   - Disables blank issues
   - Provides contact links for questions and security issues

## Workflows

### Code Quality & Standards (`workflows/code-quality.yml`)
Runs on pull requests and main branch pushes:

- **PR Title Validation**: Enforces conventional commit format
- **File Change Detection**: Only runs relevant checks based on changed files
- **TypeScript/JavaScript Linting**: Runs ESLint in project directories
- **Markdown Linting**: Validates markdown files
- **YAML Validation**: Checks YAML syntax and formatting
- **Security Audit**: Runs npm audit for vulnerabilities

## Best Practices

1. **PR Titles**: Use format `[type]: description` (e.g., `feat: add new agent`, `fix: resolve memory leak`)
2. **Small PRs**: Aim for <300 lines of code changes
3. **Documentation**: Update relevant documentation with code changes
4. **Testing**: Include tests for new features and bug fixes 