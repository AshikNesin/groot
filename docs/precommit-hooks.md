# Git Hooks & Secret Detection

This project uses Vite+ git hooks with [gitleaks](https://github.com/gitleaks/gitleaks) to prevent secrets from being committed to the repository.

## What Gets Checked

On every commit, the following checks run automatically:

| Hook             | Purpose                                                               |
| ---------------- | --------------------------------------------------------------------- |
| **Gitleaks**     | Detects hardcoded secrets (API keys, passwords, tokens, private keys) |
| **Vite+ staged** | Lints and formats staged files (Oxlint + Oxfmt)                       |

## Setup

Git hooks are configured in `.vite-hooks/pre-commit`. To install them:

```bash
# Install gitleaks (if not already installed)
brew install gitleaks  # macOS
# or: go install github.com/gitleaks/gitleaks/v8@latest  # Other platforms

# Install hooks via Vite+
pnpm prepare
```

This runs `vp config` which sets up the git hooks from `.vite-hooks/`.

## Running Manually

```bash
# Run the pre-commit hook manually
.vite-hooks/pre-commit

# Run only gitleaks
gitleaks protect --config .gitleaks.toml

# Run only Vite+ staged checks
vp staged
```

## How Gitleaks Works

Gitleaks scans your staged changes for patterns matching:

- AWS access keys and secret keys
- GitHub tokens, GitLab tokens
- Private keys (RSA, PGP, SSH)
- Database connection strings
- Generic API keys and secrets
- And [many more](https://github.com/gitleaks/gitleaks#detected-secrets)

If a secret is detected, the commit is blocked with an error message showing the file and line number.

## Configuration

### Gitleaks Config (`.gitleaks.toml`)

Customize detection rules and allowlists:

```toml
[allowlist]
paths = [
    '''^\.env\.example$''',  # Allow example env files
    '''^docs/''',            # Allow documentation
    '''\.test\.''',          # Allow test files
]
```

### Vite+ Staged Config (`vite.config.ts`)

Configure what runs on staged files:

```typescript
export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
});
```

### Adding Allowlist Entries

If you have a legitimate secret pattern (like an example key in docs):

1. Open `.gitleaks.toml`
2. Add a regex pattern to the `paths` array under `[allowlist]`

## Skipping Hooks

**Only skip hooks when absolutely necessary** (e.g., committing a known test secret):

```bash
# Skip all hooks
git commit --no-verify -m "message"
```

## Sensitive Files

The following file types are gitignored and should never be committed:

```
*.pem                    # Certificates
*.key                    # Private keys
*.crt                    # Certificates
secrets/                 # Secrets directory
credentials.json         # Credential files
service-account.json     # Service account keys
.env                     # Environment files
.env.*                   # All env variants (except .env.schema)
```

## Best Practices

1. **Never commit secrets** - Use environment variables instead
2. **Use `.env.schema`** - Document required env vars without actual values
3. **Rotate compromised keys immediately** - If a secret was committed, rotate it
4. **Review hook output** - Don't blindly skip hooks

## Troubleshooting

### Hooks not running

```bash
# Reinstall hooks
pnpm prepare
```

### False positives

If gitleaks flags something that isn't a real secret, add it to the allowlist in `.gitleaks.toml`.

## CI/CD Integration

For additional protection, add gitleaks to your CI pipeline:

```yaml
# GitHub Actions example
- name: Check for secrets
  uses: gitleaks/gitleaks-action@v2
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Resources

- [Gitleaks Documentation](https://github.com/gitleaks/gitleaks)
- [Vite+ Documentation](https://viteplus.dev)
- [OWASP Secret Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheatsheet.html)
