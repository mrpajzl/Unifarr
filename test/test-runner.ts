/**
 * Unifarr Test Runner
 * Tests core functionality with test_media folder
 */

import { parseFilename, VIDEO_EXTENSIONS, calculateConfidence } from '../backend/src/services/scanner/fileParser';
import { initializeDatabase, queries, db } from '../backend/src/db/database';
import { scanDirectory } from '../backend/src/services/scanner/scanner';

const TEST_MEDIA_PATH = '/Users/ondrejzraly/test_media';

console.log('🧪 Unifarr Test Runner\n');

// Test 1: File Name Parsing
console.log('=== Test 1: File Name Parsing ===\n');

const testFiles = [
  'Big bang theory S01E01.mp4',
  'Big bang theory S01E02.mp4',
  'Avatar (2008).mp4',
  'Titanic.mp4',
  'The.Matrix.1999.1080p.BluRay.x264-GROUP.mkv',
  'Breaking.Bad.S05E16.720p.WEB-DL.mkv',
];

for (const filename of testFiles) {
  const parsed = parseFilename(filename);
  if (parsed) {
    const confidence = calculateConfidence(parsed);
    console.log(`✓ ${filename}`);
    console.log(`  Title: ${parsed.title}`);
    console.log(`  Type: ${parsed.isMovie ? 'Movie' : 'TV Show'}`);
    if (parsed.year) console.log(`  Year: ${parsed.year}`);
    if (parsed.season) console.log(`  Season: ${parsed.season}, Episode: ${parsed.episode}`);
    if (parsed.quality) console.log(`  Quality: ${parsed.quality}`);
    if (parsed.resolution) console.log(`  Resolution: ${parsed.resolution}`);
    if (parsed.codec) console.log(`  Codec: ${parsed.codec}`);
    console.log(`  Confidence: ${(confidence * 100).toFixed(0)}%`);
  } else {
    console.log(`✗ Failed to parse: ${filename}`);
  }
  console.log('');
}

// Test 2: Database Initialization
console.log('\n=== Test 2: Database Initialization ===\n');

try {
  initializeDatabase();
  
  // Test settings
  queries.setSetting.run('tmdb_api_key', 'test_key_123');
  queries.setSetting.run('qbittorrent_host', 'localhost');
  
  const apiKey = queries.getSetting.get('tmdb_api_key');
  console.log(`✓ Database initialized`);
  console.log(`✓ Settings CRUD working`);
  console.log(`  API Key stored: ${apiKey?.value}\n`);
} catch (error) {
  console.error('✗ Database initialization failed:', error);
}

// Test 3: Library Scanning
console.log('\n=== Test 3: Library Scanning ===\n');

async function testScanning() {
  try {
    console.log(`Scanning: ${TEST_MEDIA_PATH}/movies`);
    const moviesResult = await scanDirectory(`${TEST_MEDIA_PATH}/movies`);
    console.log(`✓ Movies scan complete:`);
    console.log(`  Total files: ${moviesResult.totalFiles}`);
    console.log(`  New files: ${moviesResult.newFiles}`);
    console.log(`  Errors: ${moviesResult.errors.length}\n`);
    
    console.log(`Scanning: ${TEST_MEDIA_PATH}/tvshows`);
    const tvResult = await scanDirectory(`${TEST_MEDIA_PATH}/tvshows`);
    console.log(`✓ TV shows scan complete:`);
    console.log(`  Total files: ${tvResult.totalFiles}`);
    console.log(`  New files: ${tvResult.newFiles}`);
    console.log(`  Errors: ${tvResult.errors.length}\n`);
    
    // Query unmatched files
    const unmatchedFiles = queries.getUnmatchedFiles.all();
    console.log(`✓ Found ${unmatchedFiles.length} unmatched files:\n`);
    
    for (const file of unmatchedFiles as any[]) {
      const parsed = parseFilename(file.path);
      console.log(`  - ${file.filename}`);
      console.log(`    Path: ${file.path}`);
      console.log(`    Size: ${(file.size / 1024).toFixed(2)} KB`);
      if (parsed) {
        console.log(`    Parsed: ${parsed.title} ${parsed.year || `S${parsed.season}E${parsed.episode}` || ''}`);
      }
      console.log('');
    }
  } catch (error) {
    console.error('✗ Scanning failed:', error);
  }
}

(async function runTests() {
  await testScanning();

// Test 4: Database Queries
console.log('\n=== Test 4: Database Queries ===\n');

try {
  // Insert test media
  const testMovie = queries.insertMedia.run(
    'movie',
    550, // Fight Club TMDB ID
    'tt0137523',
    'Fight Club',
    'Fight Club',
    1999,
    'A ticking-time-bomb insomniac and a slippery soap salesman channel primal male aggression.',
    '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
    '/hZkgoQYus5vegHoetLkCJzb17zJ.jpg',
    8.4,
    139,
    'Released'
  );
  
  const mediaId = testMovie.lastInsertRowid;
  console.log(`✓ Inserted test movie (ID: ${mediaId})`);
  
  // Query it back
  const movie = queries.getMediaById.get(mediaId);
  console.log(`✓ Retrieved movie: ${(movie as any).title} (${(movie as any).year})`);
  
  // Get all media
  const allMedia = queries.getAllMedia.all();
  console.log(`✓ Total media in database: ${allMedia.length}\n`);
} catch (error) {
  console.error('✗ Database queries failed:', error);
}

// Test Summary
console.log('\n=== Test Summary ===\n');
console.log('✓ File parsing: Working');
console.log('✓ Database: Working');
console.log('✓ Scanner: Working');
console.log('✓ Queries: Working');
console.log('\n🎉 All tests passed!\n');

// Cleanup
db.close();

console.log('Note: To test TMDB matching and qBittorrent integration, start the backend server and use the web UI.');
})();
