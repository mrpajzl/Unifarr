#!/bin/bash

# Bump version script for Unifarr
# Usage: ./bump-version.sh [patch|minor|major]

BUMP_TYPE=${1:-patch}

echo "📦 Bumping version ($BUMP_TYPE)..."

# Bump backend version (source of truth)
cd backend
NEW_VERSION=$(npm version $BUMP_TYPE --no-git-tag-version | sed 's/v//')
cd ..

echo "✨ New version: $NEW_VERSION"

# Sync to frontend
node sync-version.js

# Stage all changes
git add -A

# Commit
git commit -m "🔖 Bump version to $NEW_VERSION

Changes:
- Fixed TMDB auto-matching (now actually matches instead of skipping)
- Fixed manual TMDB identify modal (prop names and event names)
- Backend now listens on 0.0.0.0 for network access
- Database migrations applied"

# Create git tag
git tag -a "v$NEW_VERSION" -m "Release $NEW_VERSION"

echo ""
echo "✅ Version bumped to $NEW_VERSION"
echo ""
echo "To push:"
echo "  git push && git push --tags"
