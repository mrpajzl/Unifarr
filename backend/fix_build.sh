#!/bin/bash
# Fix all import issues after build

echo "🔧 Fixing imports..."

# Run all fix scripts
python3 fix_imports.py > /dev/null 2>&1
python3 fix_imports2.py > /dev/null 2>&1
python3 fix_all_imports.py > /dev/null 2>&1

# Manual fixes for specific edge cases
sed -i '' "s|from '../scanner/index.js'|from '../scanner.js'|g" dist/services/download/auto-import.js
sed -i '' "s|import('../services/tmdb')|import('../services/tmdb.js')|g" dist/routes/settings.js

echo "✅ All import fixes applied"
