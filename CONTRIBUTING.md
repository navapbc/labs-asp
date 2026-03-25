# Contributing to labs-asp

Thanks for your interest in contributing! labs-asp is a Nava R&D project exploring AI agent capabilities, and we welcome bug reports, ideas, and pull requests.

Please read this guide before contributing. Also note that all participants are expected to follow our [Code of Conduct](CODE_OF_CONDUCT.md).

---

## Reporting bugs

Found something broken? Please [open a GitHub Issue](https://github.com/navapbc/labs-asp/issues) and include:

- A clear description of the problem
- Steps to reproduce it
- What you expected to happen vs. what actually happened
- Relevant environment details (OS, Node.js version, Docker version, etc.)

---

## Suggesting features

Have an idea? Open a [GitHub Issue](https://github.com/navapbc/labs-asp/issues) with the label `enhancement` and describe:

- The problem you are trying to solve
- Your proposed solution or idea
- Any alternatives you considered

Since this is a labs/experimental project, not every feature request will be accepted, but all suggestions are welcome and will be considered.

---

## Submitting a pull request

### Before you start

- Check existing [issues](https://github.com/navapbc/labs-asp/issues) and open PRs to avoid duplicating work.
- For significant changes, open an issue first to discuss the approach.

### Branch naming

Branch off of `develop` and use one of these prefixes:

| Prefix | Use for |
|--------|---------|
| `feature/` | New functionality |
| `fix/` | Bug fixes |
| `chore/` | Maintenance, tooling, dependency updates |

Example: `feature/add-weather-agent-cache`

### Opening the PR

- Target the `develop` branch (not `main`).
- Write a clear PR description that explains **what** changed and **why**.
- Reference any related issue (e.g., `Closes #42`).
- Keep PRs focused — one logical change per PR makes review faster.
- If your change touches the `client/` Git submodule, make sure the submodule pointer is updated correctly.

### Review process

A maintainer will review your PR and may request changes. Once approved, a maintainer will merge it. Please respond to review comments promptly to keep things moving.

---

## Code style

- Language: **TypeScript** — avoid `any` where reasonably possible.
- Package manager: **pnpm** — do not commit `package-lock.json` or `yarn.lock`.
- Runtime: **Node.js 20+**.
- Follow the patterns already established in the codebase. When in doubt, look at how existing agents or services are structured.
- Run `pnpm lint` and `pnpm build` locally before pushing.

---

## Developer Certificate of Origin (DCO)

This project uses the [Developer Certificate of Origin](https://developercertificate.org/) instead of a CLA. By signing off your commits you certify that you wrote the code and have the right to contribute it.

Add a sign-off to every commit using the `-s` flag:

```sh
git commit -s -m "fix: correct weather agent timeout handling"
```

This appends a `Signed-off-by` trailer to your commit message. PRs with unsigned commits will be asked to add sign-offs before merging.

---

## Getting help

If you have questions, open a [GitHub Issue](https://github.com/navapbc/labs-asp/issues) or start a discussion. We are happy to help you get oriented.
