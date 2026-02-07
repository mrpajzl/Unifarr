#!/usr/bin/env python3
import os
import re
from pathlib import Path

def is_directory_import(dist_root, file_path, import_path):
    """Check if import_path points to a directory"""
    # Resolve the import relative to the current file
    current_dir = file_path.parent
    resolved = (current_dir / import_path).resolve()
    
    # Check if it's a directory in dist/
    if resolved.is_dir():
        return True
    
    # Also check without .js extension
    if str(import_path).endswith('.js'):
        resolved_no_ext = (current_dir / import_path[:-3]).resolve()
        if resolved_no_ext.is_dir():
            return True
    
    return False

def fix_imports_in_file(filepath, dist_root):
    """Fix imports to add /index.js for directories"""
    with open(filepath, 'r') as f:
        content = f.read()
    
    new_content = content
    
    # Fix static imports: from './something'
    pattern = r"from\s+['\"](\.[^'\"]+?)['\"]"
    
    def replacer(match):
        import_path = match.group(1)
        
        # Skip if already ends with /index.js
        if import_path.endswith('/index.js'):
            return match.group(0)
        
        # Check if this import points to a directory
        if import_path.endswith('.js'):
            # Remove .js and check if it's a directory
            path_without_js = Path(import_path[:-3])
            full_path = (filepath.parent / path_without_js).resolve()
            
            if full_path.is_dir():
                # It's a directory, use /index.js
                return f"from '{import_path[:-3]}/index.js'"
        
        return match.group(0)
    
    new_content = re.sub(pattern, replacer, content)
    
    # Fix dynamic imports: import('./something') or import('../something')
    dynamic_pattern = r"import\(['\"](\.[^'\"]+?)['\"]"
    
    def dynamic_replacer(match):
        import_path = match.group(1)
        
        # Skip if already ends with .js
        if import_path.endswith('.js'):
            return match.group(0)
        
        # Add .js to dynamic imports
        return f"import('{import_path}.js'"
    
    new_content = re.sub(dynamic_pattern, dynamic_replacer, new_content)
    
    if new_content != content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        return True
    return False

def main():
    dist_root = Path('dist')
    count = 0
    
    for js_file in dist_root.rglob('*.js'):
        if fix_imports_in_file(js_file, dist_root):
            count += 1
            print(f"Fixed: {js_file}")
    
    print(f"\nFixed {count} files")

if __name__ == '__main__':
    main()
