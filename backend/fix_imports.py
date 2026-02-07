#!/usr/bin/env python3
import os
import re
from pathlib import Path

def fix_imports_in_file(filepath):
    """Add .js extension to relative imports"""
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Pattern for relative imports: from './something' or from '../something'
    # But not if it already ends with .js
    pattern = r"(from\s+['\"])(\.{1,2}/[^'\"]+?)(['\"])"
    
    def replacer(match):
        prefix = match.group(1)
        path = match.group(2)
        suffix = match.group(3)
        
        # Don't add .js if it's already there
        if path.endswith('.js'):
            return match.group(0)
        
        # Add .js
        return f"{prefix}{path}.js{suffix}"
    
    new_content = re.sub(pattern, replacer, content)
    
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
