#!/bin/bash

# Boilerplate Setup Script
# This script sets up your new project by:
# 1. Verifying .env.schema exists (for varlock)
# 2. Installing pre-commit hooks (gitleaks + vite-plus)
# 3. Asking for app name and updating it across the project
# 4. Updating package.json, DATABASE_URL, and code references with the new app name
#
# Note: Secrets are managed via Varlock + Infisical, not local .env files

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_info() {
    echo -e "${BLUE}ℹ ${NC}$1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Setup environment - verify .env.schema exists for varlock
setup_env() {
    print_info "Checking environment configuration..."

    if [ ! -f ".env.schema" ]; then
        print_error ".env.schema not found!"
        print_info "This file is required for varlock to manage secrets."
        exit 1
    fi

    print_success "Found .env.schema (varlock will handle secrets via Infisical)"
    print_info "Make sure to configure your Infisical credentials:"
    print_info "  - INFISICAL_PROJECT_ID"
    print_info "  - INFISICAL_CLIENT_ID"
    print_info "  - INFISICAL_CLIENT_SECRET"
    print_info ""
    print_info "Secrets like JWT_SECRET and ADMIN_AUTH_KEY are managed in Infisical."
}

# Setup portless
setup_portless() {
    print_info "Checking portless installation..."

    if ! command -v portless &> /dev/null; then
        print_info "portless is not installed. We recommend installing it for local development."
        read -p "Install portless globally via npm? (y/N): " -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            npm install -g portless
            print_success "portless installed successfully"
        else
            print_warning "Skipped portless installation. You may need to run 'npm install -g portless' manually."
        fi
    else
        print_success "portless is already installed"
    fi
}

# Setup pre-commit hooks (includes gitleaks)
setup_pre_commit() {
    print_info "Setting up pre-commit hooks..."

    # Check if pre-commit is installed
    if ! command -v pre-commit &> /dev/null; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            print_info "Installing pre-commit via Homebrew..."
            brew install pre-commit
        else
            print_error "pre-commit not found. Please install it:"
            echo "  pip install pre-commit"
            echo "  Then run: pre-commit install"
            return 1
        fi
    fi

    pre-commit install
    print_success "Pre-commit hooks installed (gitleaks + biome format)"
}

# Convert app name to slug format (lowercase, hyphenated)
# e.g., "Gandalf App" -> "gandalf-app"
to_slug() {
    echo "$1" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd 'a-z0-9-'
}

# Ask for app name and update RP_NAME
update_app_name() {
    print_info "Configure your application name..."

    local current_name
    current_name=$(grep -E "^RP_NAME=" .env.schema | cut -d'=' -f2-)
    print_info "Current app name: $current_name"

    read -p "Enter your app name (e.g., 'My Cool App'): " app_name

    if [ -z "$app_name" ]; then
        print_warning "No app name provided, keeping current name"
        return
    fi

    # Update RP_NAME in .env.schema with the human-readable name (e.g., "Gandalf App")
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|^RP_NAME=.*|RP_NAME=$app_name|" .env.schema
    else
        sed -i "s|^RP_NAME=.*|RP_NAME=$app_name|" .env.schema
    fi
    print_success "Updated RP_NAME in .env.schema to: $app_name"

    # Generate slug for code references (e.g., "gandalf-app")
    local slug_name
    slug_name=$(to_slug "$app_name")
    
    # Ask if user wants to update package.json and code references
    read -p "Also update package.json and code references from 'groot' to '$slug_name'? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        update_code_references "$app_name" "$slug_name"
    fi
}

# Update code references to new app name
update_code_references() {
    local app_name="$1"      # Human-readable name (e.g., "Gandalf App")
    local slug_name="$2"     # Slug for code (e.g., "gandalf-app")
    local old_name="groot"
    
    print_info "Updating code references from '$old_name' to '$slug_name'..."
    print_info "RP_NAME will remain as '$app_name' (human-readable)"
    
    # Update package.json
    if [ -f "package.json" ]; then
        # Use node to update package.json properly (preserves formatting better)
        if command -v node &> /dev/null; then
            node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.name = '$slug_name';
if (pkg.repository && pkg.repository.url) {
    pkg.repository.url = pkg.repository.url.replace(/\\/groot\\.git$/, '/$slug_name.git');
}
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"
            print_success "Updated package.json name to: $slug_name"
        else
            print_warning "Node not found, skipping package.json update"
        fi
    fi
    
    # Update logger service name
    local logger_file="server/src/core/logger/index.ts"
    if [ -f "$logger_file" ]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/service: \"$old_name\"/service: \"$slug_name\"/g" "$logger_file"
        else
            sed -i "s/service: \"$old_name\"/service: \"$slug_name\"/g" "$logger_file"
        fi
        print_success "Updated logger service name to: $slug_name"
    fi
    
    # Update instrument.ts (Sentry release)
    local instrument_file="server/src/core/instrument.ts"
    if [ -f "$instrument_file" ]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/return \`$old_name@\`/return \`$slug_name@\`/g" "$instrument_file"
        else
            sed -i "s/return \`$old_name@\`/return \`$slug_name@\`/g" "$instrument_file"
        fi
        print_success "Updated Sentry release name to: $slug_name"
    fi
    
    # Update sentry.config.js if it exists
    if [ -f "sentry.config.js" ]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/$old_name/$slug_name/g" sentry.config.js
        else
            sed -i "s/$old_name/$slug_name/g" sentry.config.js
        fi
        print_success "Updated sentry.config.js to: $slug_name"
    fi

    # Update DATABASE_URL in .env.schema with the slug name
    if [ -f ".env.schema" ]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|/dbname$|/$slug_name|" .env.schema
        else
            sed -i "s|/dbname$|/$slug_name|" .env.schema
        fi
        print_success "Updated DATABASE_URL database name to: $slug_name"
    fi
}

# Final setup steps
final_steps() {
    echo ""
    print_info "Installing dependencies..."

    if command -v pnpm &> /dev/null; then
        pnpm install
        print_success "Dependencies installed"
    else
        print_error "pnpm not found. Please install pnpm first: npm install -g pnpm"
        exit 1
    fi

    print_info "Generating Prisma client..."
    pnpm run generate
    print_success "Prisma client generated"

    echo ""
    print_info "Next steps:"
    echo "  1. Configure Infisical credentials in your environment"
    echo "  2. Run: pnpm dev (varlock will fetch secrets from Infisical)"
    echo ""
    print_success "Setup complete! Your environment is ready."
}

# Main execution
main() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║          🚀 Groot Setup                                    ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    
    # Check for required tools
    if ! command -v openssl &> /dev/null; then
        print_error "openssl is required but not installed. Please install it first."
        exit 1
    fi
    
    # Run setup steps
    setup_env
    setup_portless
    setup_pre_commit
    update_app_name
    final_steps
}

# Run main function
main
