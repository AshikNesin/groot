# Taste (Continuously Learned by [CommandCode][cmd])

[cmd]: https://commandcode.ai/

# Code Style

- Use @/ alias based paths for imports in newly created files, not relative paths. Confidence: 0.85
- Prefer arrow functions over regular functions when refactoring or writing new code. Confidence: 0.75
- Use standard libraries like lodash for common utilities instead of implementing from scratch, but don't over-engineer. Confidence: 0.80

# Express Patterns

- Remove asyncHandler wrapper since Express 5 handles async errors natively. Confidence: 0.85
- Use parseId utility instead of Number() for parsing route parameters to validate positive integers. Confidence: 0.80

# Configuration

- Keep configuration simple; avoid reinventing the wheel when standard solutions exist. Confidence: 0.75
- Use env variable fallbacks in config with ${VAR:-default} interpolation pattern. Confidence: 0.70

# Development Workflow

- Use /compound-engineering:workflows:review for code reviews. Confidence: 0.90
- When user says "Plan approved (yolo mode)", implement immediately without confirmation. Confidence: 0.95
- Address P1/P2/P3 review findings promptly. Confidence: 0.85
- Do not commit or push changes without explicit user approval; wait for them to review and commit manually. Confidence: 0.70

# Security

- Don't store tokens in localStorage; use secure httpOnly cookies instead. Confidence: 0.80
- For test cases, extract cookies from responses rather than changing frontend logic. Confidence: 0.75

# Documentation

- Keep documentation updated with recent codebase improvements. Confidence: 0.80
- Write usage documentation for new systems like config. Confidence: 0.75

# Dev Tools

- Configure portless to use non-privileged ports (8888) to avoid sudo requirements. Confidence: 0.85
- When bumping package versions, update packages directly rather than adding pnpm overrides. Confidence: 0.85
- Prefer in-process SDKs as devDependencies over global CLI binaries for dev tooling. Confidence: 0.65
- Declare `engines.node` in package.json to specify the required Node.js version. Confidence: 0.70

# Release Workflow

- When a stale changeset is blocking the release, first run `pnpm changeset` to create a proper version bump changeset before deleting the stale one. Confidence: 0.75

# UI

- For filter dropdowns with search, place the search input at the top with a separator line below it, followed by the scrollable results list. Confidence: 0.65
