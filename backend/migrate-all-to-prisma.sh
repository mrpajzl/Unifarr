#!/bin/bash

# Migrate all remaining Drizzle imports to Prisma
echo "🔄 Migrating all Drizzle imports to Prisma..."

# Find all files using Drizzle
FILES=$(grep -rl "from '../db'" src/ 2>/dev/null | grep -v ".backup" | grep -v "prisma.ts")
FILES+=" $(grep -rl 'from "../../db"' src/ 2>/dev/null | grep -v ".backup")"
FILES+=" $(grep -rl "from '../db/schema'" src/ 2>/dev/null | grep -v ".backup")"
FILES+=" $(grep -rl 'from "../../db/schema"' src/ 2>/dev/null | grep -v ".backup")"
FILES+=" $(grep -rl "from 'drizzle-orm'" src/ 2>/dev/null | grep -v ".backup")"

# Make unique
FILES=$(echo "$FILES" | tr ' ' '\n' | sort -u)

for file in $FILES; do
  if [ -f "$file" ]; then
    echo "  Migrating: $file"
    
    # Replace Drizzle imports with Prisma
    sed -i '' "s|import { db } from '../db';|import { prisma } from '../db/prisma';|g" "$file"
    sed -i '' 's|import { db } from "../../db";|import { prisma } from "../../db/prisma";|g' "$file"
    sed -i '' "s|import { db } from '../../db';|import { prisma } from '../../db/prisma';|g" "$file"
    
    # Remove schema imports (Prisma generates types)
    sed -i '' '/from.*db\/schema/d' "$file"
    sed -i '' '/from.*drizzle-orm/d' "$file"
    
    # Replace common patterns
    sed -i '' 's/db\.query\./prisma./g' "$file"
    sed -i '' 's/db\.select/prisma./g' "$file"
    sed -i '' 's/db\.insert/prisma./g' "$file"
    sed -i '' 's/db\.update/prisma./g' "$file"
    sed -i '' 's/db\.delete/prisma./g' "$file"
  fi
done

echo "✅ Migration complete - manual fixes still needed!"
echo ""
echo "⚠️  You still need to:"
echo "  1. Update query syntax (Drizzle → Prisma)"
echo "  2. Fix type errors"
echo "  3. Test each migrated file"
echo ""
echo "See PRISMA_MIGRATION.md for syntax guide"
