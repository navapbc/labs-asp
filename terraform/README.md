# Terraform Infrastructure

Deploy and manage VMs for the Labs ASP project.

## Quick Start

Deploy playground environment:
```bash
./deploy.sh playground
```

Deploy client environment:
```bash
./deploy.sh client
```

Deploy both environments:
```bash
./deploy.sh both
```

## Environments

- `playground` - Mastra backend on port 4111 for agent development
- `client` - Next.js frontend on port 3000 for users

## Commands

Deploy:
```bash
./deploy.sh [playground|client|both]
```

Destroy:
```bash
./destroy.sh [playground|client|both]
```

View outputs:
```bash
terraform output
```

## Prerequisites

- Terraform initialized
- GCP authentication configured
- Required secrets in Google Secret Manager

The scripts handle Terraform initialization automatically.
