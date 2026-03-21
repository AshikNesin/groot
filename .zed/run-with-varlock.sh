#!/bin/bash

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

cd "$PROJECT_ROOT"

export PATH="$PROJECT_ROOT/node_modules/.bin:$PATH"

exec "$PROJECT_ROOT/node_modules/.bin/varlock" run -- "$@"
