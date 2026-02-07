#!/usr/bin/env python3
import os
import re
from pathlib import Path

def fix_imports_in_file(filepath):
    """Fix directory imports to use /index.js"""
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Find imports that look like directory imports
    # Pattern: from '../db.js' should be from '../db/index.js'
    new_content = content
    
    # List of known directories in dist/
    directories = {'db', 'routes', 'services', 'lib'}
    
    for dirname in directories:
        # Match patterns like '../db.js' or './db.js'
        new_content = re.sub(
            rf"from\s+['\"](\.*/)({dirname})\.js['\"]",
            rf"from '\1\2/index.js'",
            new_content
        )
    
    if new_content != content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        return True
    return False

def main():
    dist_dir = Path('dist')
    count = 0
    
    for js_file in dist_dir.rglob('*.js'):
        if fix_imports_in_file(js_file):
            count += 1
            print(f"Fixed: {js_file}")
    
    print(f"\nFixed {count} files")

if __name__ == '__main__':
    main()
