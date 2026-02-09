#!/bin/sh
set -e

# Nuxt 3 runtime config override
# Environment variables with NUXT_ prefix are automatically picked up
if [ -n "$NUXT_PUBLIC_API_BASE" ]; then
  echo "🔧 Runtime API base: $NUXT_PUBLIC_API_BASE"
fi

# Execute the original command
exec "$@"
