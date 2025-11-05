# Contributing to Conductor CRM

## Overview

Conductor CRM has a **hybrid architecture**:
- **Opensource Core**: Conductor, Gateway, and Web (MIT License)
- **Private CRM**: Backend, Frontend, and Plugins (Proprietary)

## Contributing Guidelines

### 1. Contributing to Private CRM Code

**Workflow:**

```bash
# 1. Create feature branch
git checkout -b feature/your-feature

# 2. Make changes in:
#    - src/backend/
#    - src/frontend/
#    - plugins/crm/

# 3. Test locally
docker-compose -f docker-compose.dev.yml up

# 4. Commit
git add .
git commit -m "feat: your feature description"

# 5. Push and open PR
git push origin feature/your-feature
```

**Guidelines:**
- Use conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, etc.
- Add tests for new features
- Update documentation
- Never commit secrets or `.env` files

### 2. Contributing to Opensource Core (Conductor)

If you need to improve the **opensource Conductor core**:

**Workflow:**

```bash
# 1. Work in submodule
cd conductor/conductor
git checkout -b feature/improve-core

# 2. Make generic improvements (no CRM-specific logic)
# Edit core files...

# 3. Commit in submodule
git commit -m "feat: improve agent registry"

# 4. Push to your fork
git remote add fork git@github.com:youruser/conductor.git
git push fork feature/improve-core

# 5. Open PR to upstream
gh pr create --repo primoia/conductor \
  --title "feat: improve agent registry" \
  --body "Generic improvement that benefits all conductor users"

# 6. After merge, update submodule reference in CRM
cd ../..
git add conductor/
git commit -m "chore: update conductor to include new feature"
```

**Important Rules:**
- ❌ **Never** commit CRM-specific code to opensource core
- ✅ **Always** keep core improvements generic
- ✅ **Test** core changes in CRM context before submitting PR
- ✅ **Follow** Conductor's contributing guidelines

### 3. Security: Git Hooks

**Install pre-commit hook** to prevent accidents:

```bash
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash

# Prevent committing in submodules
if git diff --cached --name-only | grep -q "^conductor/"; then
    echo ""
    echo "❌ ERROR: Attempting to commit in submodule!"
    echo ""
    echo "To contribute to core:"
    echo "  1. cd conductor/conductor"
    echo "  2. git checkout -b feature/your-feature"
    echo "  3. Make changes"
    echo "  4. git commit"
    echo "  5. git push fork feature/your-feature"
    echo "  6. Open PR to upstream"
    echo ""
    exit 1
fi

# Check for secrets
if git diff --cached | grep -iE "(api_key|secret|password)" | grep -v "example"; then
    echo ""
    echo "⚠️  WARNING: Possible secret detected!"
    read -p "Continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi
EOF

chmod +x .git/hooks/pre-commit
```

## Code Style

### Python (Backend)

```python
# Use Black for formatting
black src/backend/

# Use type hints
def qualify_lead(lead_id: str) -> Dict[str, Any]:
    ...

# Follow PEP 8
```

### TypeScript/Angular (Frontend)

```typescript
// Use Prettier
npm run format

// Follow Angular style guide
// Use strict TypeScript
```

## Testing

### Run Tests

```bash
# Backend tests
cd src/backend
pytest

# Frontend tests
cd src/frontend
npm run test

# Integration tests
docker-compose -f docker-compose.test.yml up
```

## Pull Request Process

1. **Title**: Use conventional commits format
   - `feat: add lead scoring feature`
   - `fix: resolve email template bug`
   - `docs: update API documentation`

2. **Description**: Explain:
   - What changes were made
   - Why they were made
   - How to test them

3. **Checklist**:
   - [ ] Tests added/updated
   - [ ] Documentation updated
   - [ ] No secrets committed
   - [ ] Code formatted
   - [ ] Tested locally

4. **Review**: At least 1 approval required

## Questions?

- Check documentation in `/project-management/new-features/`
- Ask in team chat
- Open issue in internal tracker

---

**Remember**: Keep opensource contributions generic, CRM-specific code private!
