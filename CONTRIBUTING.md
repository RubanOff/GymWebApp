# Contributing

## Branch strategy

- `main` is the production branch
- new work goes into one short-lived branch per task
- branch names:
  - `feature/...` for product work
  - `fix/...` for bug fixes
  - `chore/...` for CI, tooling, docs, and maintenance

Examples:

- `feature/workout-ux`
- `fix/magic-link-redirect`
- `chore/ci`

## Recommended local flow

```bash
git checkout main
git pull origin main
git checkout -b feature/some-task

# work
git add .
git commit -m "Do some task"
git push -u origin feature/some-task
```

Then:

1. Open a pull request into `main`
2. Wait for the `CI` workflow to pass
3. Merge into `main`
4. Let the `Deploy` workflow ship production automatically

## CI/CD model

- `CI` runs on `pull_request` into `main`
- `Deploy` runs on `push` to `main`

Current CI checks:

- `npm ci`
- `npm run typecheck`
- `npm run build`

## Main branch protection

Set this manually in GitHub:

1. `Settings`
2. `Branches`
3. Add a rule for `main`

Recommended minimum settings:

- `Require a pull request before merging`
- `Require status checks to pass before merging`
- required check: `CI / checks`
- `Require branches to be up to date before merging`

This keeps `main` deployable while staying light enough for a solo workflow.
