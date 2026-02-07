#!/usr/bin/env python3
import re

# Read the file
with open('src/routes/discover.ts', 'r') as f:
    content = f.read()

# Pattern to match the broken code
# Looking for: "const tmdb = await getTMDBService();\n    }\n" and replacing with just "const tmdb = await getTMDBService();\n"
content = re.sub(
    r'(const tmdb = await getTMDBService\(\);)\s*\n\s*\}\s*\n',
    r'\1\n',
    content
)

# Write back
with open('src/routes/discover.ts', 'w') as f:
    f.write(content)

print("Fixed discover.ts")
