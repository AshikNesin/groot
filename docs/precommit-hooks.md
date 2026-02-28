# Pre-commit Hooks & Secret Detection

This project uses [pre-commit](https://pre-commit.com/) framework with [gitleaks](https://github.com/gitleaks/gitleaks) to prevent secrets from being committed to the repository.

## What Gets Checked

On every commit, the following checks run automatically:

| Hook | Purpose |
|------|---------|
| **Gitleaks** | Detects hardcoded secrets (API keys, passwords, tokens, private keys) |
| **Biome lint** | Lints TypeScript/JavaScript files |
| **Biome format** | Auto-formats code to match project style |

## Setup

Pre-commit hooks are configured in `.pre-commit-config.yaml`. To install them:

```bash
# Install pre-commit (if not already installed)
brew install pre-commit

# Install the hooks
pre-commit install
```

## Running Manually

```bash
# Run all hooks on all files
pre-commit run --all-files

# Run only gitleaks
pre-commit run gitleaks --all-files

# Run only linting
pre-commit run biome-lint --all-files
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

### Adding Allowlist Entries

If you have a legitimate secret pattern (like an example key in docs):

1. Open `.gitleaks.toml`
2. Add a regex pattern to the `paths` array under `[allowlist]`

## Skipping Hooks

**Only skip hooks when absolutely necessary** (e.g., committing a known test secret):

```bash
# Skip all hooks
git commit --no-verify -m "message"

# Skip only gitleaks
SKIP=gitleaks git commit -m "message"

# Skip multiple hooks
SKIP=gitleaks,biome-lint git commit -m "message"
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
.env.*                   # All env variants (except .env.example)
```

## Best Practices

1. **Never commit secrets** - Use environment variables instead
2. **Use `.env.example`** - Document required env vars without actual values
3. **Rotate compromised keys immediately** - If a secret was committed, rotate it
4. **Review pre-commit output** - Don't blindly skip hooks
5. **Keep hooks updated** - Run `pre-commit autoupdate` periodically

## Troubleshooting

### "Permission denied" errors

```bash
# Fix pre-commit cache permissions
rm -rf ~/.cache/pre-commit/.lock
pre-commit install
```

### Hooks not running

```bash
# Reinstall hooks
pre-commit install --install-hooks
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
- [Pre-commit Documentation](https://pre-commit.com/)
- [OWASP Secret Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheatsheet.html)
