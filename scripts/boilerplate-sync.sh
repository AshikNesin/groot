#!/bin/bash
#
# Boilerplate Sync Status Script
#
# Run: ./scripts/boilerplate-sync.sh
#
# Shows what changes are available from the boilerplate repo

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CONFIG_FILE="$PROJECT_ROOT/.groot/boilerplate-sync.json"

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo "❌ jq is required. Install with: brew install jq"
    exit 1
fi

# Load config
BOILERPLATE_PATH=$(jq -r '.boilerplate.local_path' "$CONFIG_FILE")
LAST_SYNC=$(jq -r '.last_sync.commit' "$CONFIG_FILE")
LAST_SYNC_DATE=$(jq -r '.last_sync.date' "$CONFIG_FILE")

echo "🔄 Boilerplate Sync Status"
echo ""
echo "Boilerplate: $(jq -r '.boilerplate.repo' "$CONFIG_FILE")"
echo "Local path:  $BOILERPLATE_PATH"
echo "Last sync:   ${LAST_SYNC:0:7} ($LAST_SYNC_DATE)"
echo ""

# Fetch latest from boilerplate
echo "📥 Fetching latest from boilerplate..."
git -C "$BOILERPLATE_PATH" fetch origin 2>/dev/null || true

# Get new commits
echo ""
echo "📝 New commits since last sync:"
echo ""
git -C "$BOILERPLATE_PATH" log --oneline "$LAST_SYNC"..HEAD 2>/dev/null || echo "Already up to date!"

# Get changed files
echo ""
echo "📁 Changed files:"
echo ""

FILES=$(git -C "$BOILERPLATE_PATH" diff --name-only "$LAST_SYNC"..HEAD 2>/dev/null | grep -v '^$' || true)

if [ -z "$FILES" ]; then
    echo "No files changed."
    exit 0
fi

# Categorize files
SYNC_FILES=""
SKIP_FILES=""

while IFS= read -r file; do
    # Check if file matches include patterns
    SHOULD_INCLUDE=false

    # Simple pattern matching
    case "$file" in
        .pre-commit-config.yaml|.gitleaks.toml|biome.json|tsconfig.json|vite.config.ts|vitest.config.ts|vitest.workspace.ts|playwright.config.ts|postcss.config.js|tailwind.config.js|sentry.config.js|Procfile|pnpm-workspace.yaml|nixpacks.toml)
            SHOULD_INCLUDE=true
            ;;
        scripts/*|tests/*|.claude/settings.json|.claude/commands/*)
            SHOULD_INCLUDE=true
            ;;
        prisma/config.ts)
            SHOULD_INCLUDE=true
            ;;
    esac

    # Check exclude patterns
    case "$file" in
        README.md|package.json|pnpm-lock.yaml|.env*|prisma/schema.prisma|prisma/migrations/*|client/*|server/*|dist/*|node_modules/*)
            SHOULD_INCLUDE=false
            ;;
    esac

    if [ "$SHOULD_INCLUDE" = true ]; then
        SYNC_FILES="$SYNC_FILES\n   $file"
    else
        SKIP_FILES="$SKIP_FILES\n   $file"
    fi
done <<< "$FILES"

echo "✅ Will sync:"
if [ -n "$SYNC_FILES" ]; then
    echo -e "$SYNC_FILES"
else
    echo "   (none)"
fi

echo ""
echo "⏭️  Will skip (not in include patterns):"
if [ -n "$SKIP_FILES" ]; then
    echo -e "$SKIP_FILES"
else
    echo "   (none)"
fi

# Show latest commit
NEW_HEAD=$(git -C "$BOILERPLATE_PATH" rev-parse HEAD)
echo ""
echo "📌 Latest boilerplate commit: $NEW_HEAD"
echo ""
echo "To sync, run the AI prompt from: .groot/boilerplate-sync-prompt.md"
