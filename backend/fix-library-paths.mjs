import Database from 'better-sqlite3';
import path from 'path';

const db = new Database('./unifarr.db');

// Fix TV show library paths - should point to show root, not individual files
const tvMediaItems = db.prepare(`
  SELECT DISTINCT m.id, m.title, f.path 
  FROM media_items m
  JOIN files f ON f.media_item_id = m.id
  WHERE m.type = 'tv'
`).all();

for (const item of tvMediaItems) {
  // Extract show root folder from file path
  // e.g., /path/to/tvshows/Big Bang Theory/Season 1/episode.mp4 -> /path/to/tvshows/Big Bang Theory
  const filePath = item.path;
  const parts = filePath.split('/');
  
  // Find "Season XX" in path and take parent
  let showRoot = filePath;
  for (let i = parts.length - 1; i >= 0; i--) {
    if (/^Season\s+\d+$/i.test(parts[i])) {
      // Found season folder, take everything before it
      showRoot = parts.slice(0, i).join('/');
      break;
    }
  }
  
  // If no Season folder found, take parent of file
  if (showRoot === filePath) {
    showRoot = path.dirname(filePath);
  }
  
  console.log(`${item.title}: ${showRoot}`);
  
  db.prepare('UPDATE media_items SET library_path = ? WHERE id = ?')
    .run(showRoot, item.id);
}

console.log(`\n✅ Updated ${tvMediaItems.length} TV show library paths`);

// Fix movie library paths - should point to movie folder
const movieMediaItems = db.prepare(`
  SELECT DISTINCT m.id, m.title, f.path 
  FROM media_items m
  JOIN files f ON f.media_item_id = m.id
  WHERE m.type = 'movie' AND m.library_path IS NULL
`).all();

for (const item of movieMediaItems) {
  const movieFolder = path.dirname(item.path);
  
  console.log(`${item.title}: ${movieFolder}`);
  
  db.prepare('UPDATE media_items SET library_path = ? WHERE id = ?')
    .run(movieFolder, item.id);
}

console.log(`\n✅ Updated ${movieMediaItems.length} movie library paths`);

db.close();
