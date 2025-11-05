# Commit Procedure - Monorepo with Submodules

## Overview

This monorepo contains 3 git submodules in `conductor/` directory. Commits must follow a specific order to maintain consistency.

## Commit Order

### 1. Conductor Core
```bash
cd conductor/conductor
git add .
git commit -m "feat: your changes description"
git push origin main
cd ../..
```

### 2. Conductor Gateway
```bash
cd conductor/conductor-gateway
git add .
git commit -m "feat: your changes description"
git push origin main
cd ../..
```

### 3. Conductor Web
```bash
cd conductor/conductor-web
git add .
git commit -m "feat: your changes description"
git push origin main
cd ../..
```

### 4. Monorepo (Update Submodule References)
```bash
git add conductor/
git commit -m "chore: update submodule references"
git push origin main
```

## Important Notes

- Always commit submodules **before** the monorepo
- Use conventional commit messages (feat, fix, chore, docs, etc.)
- The monorepo commit updates the submodule references to the new commits
- Verify changes with `git status` before committing

## Quick Script

```bash
# Navigate to each submodule, commit and push
for module in conductor conductor-gateway conductor-web; do
  cd conductor/$module
  git add .
  git commit -m "feat: your changes"
  git push origin main
  cd ../..
done

# Update monorepo references
git add conductor/
git commit -m "chore: update submodule references"
git push origin main
```

## Verification

Check submodule status:
```bash
git submodule status
```

Update submodules to latest:
```bash
git submodule update --remote --merge
```
