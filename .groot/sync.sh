#!/bin/bash
#
# Groot Sync Status Script
#
# Run: ./.groot/sync.sh
#
# Shows what changes are available from the groot boilerplate repo
# Always fetches from remote main branch

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
BOILERPLATE_REPO=$(jq -r '.boilerplate.repo' "$CONFIG_FILE")
LAST_SYNC=$(jq -r '.last_sync.commit' "$CONFIG_FILE")
LAST_SYNC_DATE=$(jq -r '.last_sync.date' "$CONFIG_FILE")

# Create temp directory for cloning
TEMP_DIR=$(mktemp -d /tmp/groot-sync.XXXXXX)

# Cleanup function
cleanup() {
    rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

echo "🔄 Groot Sync Status"
echo ""
echo "Boilerplate: $BOILERPLATE_REPO"
echo "Branch:      main"
echo "Last sync:   ${LAST_SYNC:0:7} ($LAST_SYNC_DATE)"
echo ""

# Clone boilerplate repo (shallow clone for speed)
echo "📥 Fetching latest from remote..."
git clone --depth 100 --branch main "$BOILERPLATE_REPO" "$TEMP_DIR" 2>/dev/null

# Get new commits
echo ""
echo "📝 New commits since last sync:"
echo ""
git -C "$TEMP_DIR" log --oneline "$LAST_SYNC"..HEAD 2>/dev/null || echo "Already up to date!"

# Get changed files
echo ""
echo "📁 Changed files:"
echo ""

FILES=$(git -C "$TEMP_DIR" diff --name-only "$LAST_SYNC"..HEAD 2>/dev/null | grep -v '^$' || true)

if [ -z "$FILES" ]; then
    echo "No files changed."
    exit 0
fi

# Categorize files by exclude patterns only
SYNC_FILES=""
SKIP_FILES=""

while IFS= read -r file; do
    # Check exclude patterns (hard skip)
    SHOULD_SKIP=false
    case "$file" in
        README.md|package.json|pnpm-lock.yaml|.env*|prisma/schema.prisma|prisma/migrations/*|dist/*|node_modules/*|.gitignore)
            SHOULD_SKIP=true
            ;;
    esac

    if [ "$SHOULD_SKIP" = true ]; then
        SKIP_FILES="$SKIP_FILES\n   $file"
    else
        SYNC_FILES="$SYNC_FILES\n   $file"
    fi
done <<< "$FILES"

echo "✅ Will sync:"
if [ -n "$SYNC_FILES" ]; then
    echo -e "$SYNC_FILES"
else
    echo "   (none)"
fi

echo ""
echo "⏭️  Will skip (exclude patterns):"
if [ -n "$SKIP_FILES" ]; then
    echo -e "$SKIP_FILES"
else
    echo "   (none)"
fi

# Show latest commit
NEW_HEAD=$(git -C "$TEMP_DIR" rev-parse HEAD)
echo ""
echo "📌 Latest boilerplate commit: $NEW_HEAD"
echo ""
echo "To sync, run: /groot-sync"
