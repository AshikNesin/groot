#!/bin/bash
# Wrapper for Zed debugger: runs node through portless + varlock
# All arguments ($@) are passed to node (including --inspect-brk from the debugger)

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"
export PATH="$PROJECT_ROOT/node_modules/.bin:$PATH"

if command -v portless &>/dev/null && [ "${PORTLESS}" != "0" ]; then
  exec portless run --name groot varlock run -- node "$@"
else
  exec varlock run -- node "$@"
fi
