#!/bin/bash

# Boilerplate Setup Script
#
# Run after cloning groot to customize it for your project:
#   1. Verify / install global CLIs (varlock, portless)
#   2. Install git hooks (Vite+ hooks via `pnpm prepare`)
#   3. Ask for app name and propagate it across config.yml, package.json,
#      and .env.schema (Doppler project)
#   4. Install dependencies + generate Prisma client
#
# Usage:  pnpm groot:setup

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_info()  { echo -e "${BLUE}ℹ ${NC}$1"; }
print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_error()  { echo -e "${RED}✗${NC} $1"; }

# Convert app name to slug format (lowercase, hyphenated)
# e.g., "My Cool App" -> "my-cool-app"
to_slug() {
    echo "$1" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd 'a-z0-9-'
}

# Cross-platform sed in-place edit
sed_inplace() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "$@"
    else
        sed -i "$@"
    fi
}

# ---------------------------------------------------------------
# Step 1: Global CLI tools
# ---------------------------------------------------------------

setup_varlock() {
    print_info "Checking varlock..."
    if command -v varlock &> /dev/null; then
        print_success "varlock is installed"
    else
        print_info "Installing varlock..."
        curl -sSfL https://varlock.dev/install.sh | sh -s
        print_success "varlock installed"
    fi
}

setup_portless() {
    print_info "Checking portless..."
    if command -v portless &> /dev/null; then
        print_success "portless is installed"
        return
    fi
    read -rp "Install portless globally via npm? (y/N): " -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        npm install -g portless || { print_warning "Failed — run 'npm install -g portless' manually."; return; }
        command -v portless &> /dev/null && print_success "portless installed" || print_warning "Installation may have failed"
    else
        print_warning "Skipped. Install later with: npm install -g portless"
    fi
}

# ---------------------------------------------------------------
# Step 2: Prerequisites — must be a git repo with deps installed
# ---------------------------------------------------------------

check_git_repo() {
    if ! git rev-parse --is-inside-work-tree &> /dev/null; then
        print_error "Not a git repository. Run this script from the project root."
        exit 1
    fi
}

install_dependencies() {
    print_info "Installing dependencies..."
    pnpm install
    print_success "Dependencies installed"

    # `pnpm install` auto-runs the `prepare` lifecycle script (`vp config`),
    # which installs git hooks into .vite-hooks/ (lint-staged + gitleaks).
    # Verify it took effect rather than assuming.
    if git config core.hooksPath &> /dev/null; then
        print_success "Git hooks installed via Vite+ (lint-staged + gitleaks)"
    else
        print_warning "Git hooks not detected. Run 'pnpm prepare' manually."
    fi
}

# ---------------------------------------------------------------
# Step 3: App name — propagate to config.yml, package.json, .env.schema
# ---------------------------------------------------------------

ensure_config_yml() {
    if [ ! -f "config.yml" ]; then
        if [ -f "config.example.yml" ]; then
            cp config.example.yml config.yml
            print_info "Created config.yml from config.example.yml"
        else
            print_error "config.yml not found and no config.example.yml to copy from!"
            exit 1
        fi
    fi
}

update_app_name() {
    print_info "Configure your application name..."

    local current_name
    current_name=$(grep -E '^\s+name:\s*' config.yml | head -1 | sed 's/.*name:\s*"*//;s/"\s*$//')
    print_info "Current app name: ${current_name:-groot}"

    read -rp "Enter your app name (e.g., 'My Cool App'): " app_name
    if [ -z "$app_name" ]; then
        print_warning "No app name provided, keeping '$current_name'"
        return 0
    fi

    local slug_name
    slug_name=$(to_slug "$app_name")
    echo

    # --- config.yml: app.name (human-readable) + passkey.rpName ---
    # These are the user-facing labels shown in logs, Sentry, and passkey prompts.
    ensure_config_yml
    sed_inplace "s|^\([[:space:]]*\)name:[[:space:]]*\"[^\"]*\"|\1name: \"$app_name\"|" config.yml
    sed_inplace "s|^\([[:space:]]*\)rpName:[[:space:]]*\"[^\"]*\"|\1rpName: \"$app_name\"|" config.yml
    print_success "config.yml: app.name + passkey.rpName → '$app_name'"

    # --- package.json: name (slug) ---
    # The DB name is auto-derived from package.json name via
    # scripts/get-local-db-connection-string.cjs, so updating it here
    # automatically configures the local database name.
    if command -v node &> /dev/null; then
        node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.name = '$slug_name';
if (pkg.repository?.url) {
    pkg.repository.url = pkg.repository.url.replace(/\\/[a-z0-9_-]+\\.git$/, '/$slug_name.git');
}
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"
        print_success "package.json: name → '$slug_name'"
    else
        print_warning "Node not found — skipping package.json name update"
    fi

    # --- .env.schema: @initDoppler(project=...) ---
    # The Doppler project name must match the project you created in Doppler.
    if [ -f ".env.schema" ]; then
        sed_inplace "s|@initDoppler(project=[^,]*,|@initDoppler(project=$slug_name,|" .env.schema
        print_success ".env.schema: @initDoppler(project=$slug_name)"
    fi
}

# ---------------------------------------------------------------
# Step 4: Prisma + next steps
# ---------------------------------------------------------------

final_steps() {
    print_info "Generating Prisma client..."
    pnpm generate
    print_success "Prisma client generated"

    echo ""
    print_info "Next steps:"
    echo "  1. Set DOPPLER_TOKEN (or set secrets directly on your hosting platform)"
    echo "  2. Run: pnpm dev"
    echo ""
    print_success "Setup complete!"
}

# ---------------------------------------------------------------
# Main
# ---------------------------------------------------------------

main() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║          🚀 Groot Setup                                    ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""

    check_git_repo
    setup_varlock
    setup_portless
    update_app_name
    install_dependencies
    final_steps
}

main
