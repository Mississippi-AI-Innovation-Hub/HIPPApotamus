# Contributing to HIPAApotamus

## Commit Message Conventions

All commits must follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).

```
<type>(<optional scope>): <short description>
```

- The description is lowercase, imperative tense, no period at the end.
- Keep it under 72 characters.
- Reference an issue number in the body if one exists.

### Allowed Types

| Type | When to use |
|---|---|
| `feat` | A new feature or user-facing behavior |
| `fix` | A bug fix |
| `chore` | Maintenance — dependency updates, config changes, tooling |
| `docs` | Documentation only (README, CONTRIBUTING, inline JSDoc) |
| `infra` | AWS CDK stacks, CI/CD pipelines, IaC changes |
| `seed` | Seed scripts, mock data, test fixtures |
| `test` | Adding or updating tests |

### Examples

```
feat: add BAA expiration reminder email via SES
fix: correct DynamoDB GSI query for expiring_soon status
chore: upgrade next to 15.2.0
docs: update README with Milestone 10 deployment steps
infra: add S3 bucket CDK construct with versioning enabled
seed: add five Mississippi DOH mock vendors and BAA records
test: add unit tests for BAA status transition logic
```

---

## Branch Naming

Branch off `main`. Use one of the four prefixes below, followed by a short
kebab-case description. If there is a GitHub issue number, include it.

```
<prefix>/<issue-number>-<short-description>
```

| Prefix | When to use |
|---|---|
| `feature/` | New feature work |
| `fix/` | Bug fixes |
| `infra/` | CDK / CI / IaC changes |
| `docs/` | Documentation only |

### Examples

```
feature/12-baa-signature-flow
fix/34-expiration-date-off-by-one
infra/56-s3-bucket-cdk-construct
docs/78-update-deployment-guide
```

Rules:
- All lowercase, no spaces, no underscores — hyphens only.
- Keep descriptions short (3–5 words max).
- Never commit directly to `main`.

---

## Pull Request Process

1. **Branch** — create your branch from the latest `main` (see naming above).
2. **Scope** — one concern per PR. Don't mix a feature with an infra change.
3. **Pre-review checklist** — before requesting review, confirm all of the following locally:
   - [ ] `npm run build` passes with zero errors
   - [ ] `npm run lint` passes with zero errors
   - [ ] `npx tsc --noEmit` passes with zero errors
   - [ ] No secrets, API keys, or `.env` files are included in the diff
   - [ ] New async functions have `try/catch` with typed errors
   - [ ] No `console.log` outside of `src/lib/logger.ts`
4. **PR description** — include:
   - What changed and why (not just what — the why matters for HIPAA audit trails)
   - Any migrations, seed changes, or environment variable additions required
   - Screenshots or curl examples for UI or API changes
5. **Review** — at least one approval required before merge.
6. **Merge** — squash merge into `main`. Delete the branch after merge.

---

## Environment Variables

If your change introduces a new environment variable:

1. Add it to `.env.example` with a comment explaining what it is and where to get it.
2. Document it in the Environment Variables table in `README.md`.
3. Never commit a `.env` file or a real value anywhere in the repo.
