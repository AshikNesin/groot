#!/bin/bash

# Boilerplate Setup Script
# This script sets up your new project by:
# 1. Copying .env.example to .env
# 2. Generating secure secrets for JWT_SECRET and ADMIN_AUTH_KEY
# 3. Asking for app name and updating it across the project
# 4. Updating package.json with the new app name

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

# Generate a secure random string
generate_secret() {
    local length=${1:-64}
    # Use openssl to generate cryptographically secure random bytes
    # Base64 encode and remove special chars, then truncate to desired length
    openssl rand -base64 48 | tr -d '/+=' | cut -c1-"$length"
}

# Check if .env already exists
check_env_exists() {
    if [ -f ".env" ]; then
        print_warning ".env file already exists!"
        read -p "Do you want to overwrite it? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Keeping existing .env file"
            return 1
        fi
        # Backup existing .env
        cp .env ".env.backup.$(date +%Y%m%d%H%M%S)"
        print_info "Backed up existing .env file"
    fi
    return 0
}

# Setup environment file
setup_env() {
    print_info "Setting up environment file..."
    
    if check_env_exists; then
        cp .env.example .env
        print_success "Created .env from .env.example"
    fi
    
    # Generate JWT_SECRET (minimum 32 characters for security)
    local jwt_secret
    jwt_secret=$(generate_secret 64)
    
    # Generate ADMIN_AUTH_KEY
    local admin_auth_key
    admin_auth_key=$(generate_secret 48)
    
    # Update .env file with secure secrets
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|^JWT_SECRET=.*|JWT_SECRET=$jwt_secret|" .env
        sed -i '' "s|^ADMIN_AUTH_KEY=.*|ADMIN_AUTH_KEY=$admin_auth_key|" .env
    else
        # Linux
        sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$jwt_secret|" .env
        sed -i "s|^ADMIN_AUTH_KEY=.*|ADMIN_AUTH_KEY=$admin_auth_key|" .env
    fi
    
    print_success "Generated secure JWT_SECRET (64 chars)"
    print_success "Generated secure ADMIN_AUTH_KEY (48 chars)"
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
    current_name=$(grep -E "^RP_NAME=" .env | cut -d'=' -f2-)
    print_info "Current app name: $current_name"
    
    read -p "Enter your app name (e.g., 'My Cool App'): " app_name
    
    if [ -z "$app_name" ]; then
        print_warning "No app name provided, keeping current name"
        return
    fi
    
    # Update RP_NAME in .env with the human-readable name (e.g., "Gandalf App")
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|^RP_NAME=.*|RP_NAME=$app_name|" .env
    else
        sed -i "s|^RP_NAME=.*|RP_NAME=$app_name|" .env
    fi
    print_success "Updated RP_NAME in .env to: $app_name"
    
    # Generate slug for code references (e.g., "gandalf-app")
    local slug_name
    slug_name=$(to_slug "$app_name")
    
    # Ask if user wants to update package.json and code references
    read -p "Also update package.json and code references from 'express-react-boilerplate' to '$slug_name'? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        update_code_references "$app_name" "$slug_name"
    fi
}

# Update code references to new app name
update_code_references() {
    local app_name="$1"      # Human-readable name (e.g., "Gandalf App")
    local slug_name="$2"     # Slug for code (e.g., "gandalf-app")
    local old_name="express-react-boilerplate"
    
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
    pkg.repository.url = pkg.repository.url.replace(/github\\.com\\/[^/]+\\//, 'github.com/your-username/');
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
    
    print_info "Note: You may need to manually update GitHub URLs in package.json"
}

# Final setup steps
final_steps() {
    echo ""
    print_info "Next steps:"
    echo "  1. Edit .env and update DATABASE_URL with your database credentials"
    echo "  2. Run: pnpm install"
    echo "  3. Run: pnpm prisma generate"
    echo "  4. Run: pnpm prisma db push"
    echo "  5. Run: pnpm dev"
    echo ""
    print_success "Setup complete! Your environment is ready."
    print_warning "IMPORTANT: Keep your .env file secure and never commit it to git!"
}

# Main execution
main() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║          🚀 Express React Boilerplate Setup                ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    
    # Check for required tools
    if ! command -v openssl &> /dev/null; then
        print_error "openssl is required but not installed. Please install it first."
        exit 1
    fi
    
    # Run setup steps
    setup_env
    update_app_name
    final_steps
}

# Run main function
main
