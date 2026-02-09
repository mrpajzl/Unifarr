#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Read backend version (source of truth)
const backendPackage = JSON.parse(
  readFileSync(join(__dirname, 'backend/package.json'), 'utf-8')
);
const version = backendPackage.version;

console.log(`📦 Syncing version: ${version}`);

// Update frontend version
const frontendPath = join(__dirname, 'frontend/package.json');
const frontendPackage = JSON.parse(readFileSync(frontendPath, 'utf-8'));
frontendPackage.version = version;
writeFileSync(frontendPath, JSON.stringify(frontendPackage, null, 2) + '\n');
console.log(`✅ Frontend: ${version}`);

// Update docker-compose production version (if needed)
const composePath = join(__dirname, 'docker-compose.prod.yml');
let composeContent = readFileSync(composePath, 'utf-8');
const oldComposeContent = composeContent;

// Update image tags if they exist
composeContent = composeContent.replace(
  /image:\s*ghcr\.io\/mrpajzl\/unifarr\/(backend|frontend):[\d.]+/g,
  (match, service) => `image: ghcr.io/mrpajzl/unifarr/${service}:${version}`
);

if (composeContent !== oldComposeContent) {
  writeFileSync(composePath, composeContent);
  console.log(`✅ Docker Compose: ${version}`);
}

console.log(`\n🎉 Version sync complete!`);
console.log(`\nNext steps:`);
console.log(`  1. git add -A`);
console.log(`  2. git commit -m "🔖 Bump version to ${version}"`);
console.log(`  3. git push`);
console.log(`  4. GitHub Actions will build new images`);
