# Unifarr Backend - Quick Start Guide

Get up and running in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- A TMDB API key ([get one here](https://www.themoviedb.org/settings/api))

## Installation

```bash
# 1. Navigate to backend directory
cd /Users/ondrejzraly/clawd/unifarr/backend

# 2. Install dependencies
npm install

# 3. Create .env file
cat > .env << EOF
PORT=3000
TMDB_API_KEY=your_api_key_here
DATABASE_PATH=./unifarr.db
EOF

# 4. Generate database migrations
npm run db:generate

# 5. Start the server
npm run dev
```

You should see:
```
🚀 Unifarr API starting on port 3000
```

## Test the API

```bash
# Health check
curl http://localhost:3000

# Should return:
# {
#   "name": "Unifarr API",
#   "version": "1.0.0",
#   "status": "online"
# }
```

## Try It Out

### 1. Scan a directory

```bash
curl -X POST http://localhost:3000/api/files/scan \
  -H "Content-Type: application/json" \
  -d '{
    "path": "/path/to/your/media/folder"
  }'
```

**Response:**
```json
{
  "scanned": 150,
  "added": 120,
  "updated": 30,
  "errors": []
}
```

### 2. View unmatched files

```bash
curl http://localhost:3000/api/files/unmatched
```

**Example response:**
```json
[
  {
    "id": 1,
    "path": "/media/movies/Inception.2010.1080p.BluRay.x264.mkv",
    "filename": "Inception.2010.1080p.BluRay.x264.mkv",
    "parsedTitle": "Inception",
    "parsedYear": 2010,
    "parsedQuality": "BluRay 1080p x264",
    "matched": 0
  }
]
```

### 3. Search TMDB

```bash
curl "http://localhost:3000/api/search/tmdb/movies?q=Inception&year=2010"
```

### 4. Create media item

```bash
curl -X POST http://localhost:3000/api/media \
  -H "Content-Type: application/json" \
  -d '{
    "tmdbId": 27205,
    "type": "movie"
  }'
```

### 5. Match file to media

```bash
curl -X POST http://localhost:3000/api/media/1/match \
  -H "Content-Type: application/json" \
  -d '{
    "fileId": 1,
    "confidence": 0.95
  }'
```

### 6. Search torrents

```bash
curl "http://localhost:3000/api/providers/search?q=Inception&type=movie&year=2010"
```

**Example response:**
```json
[
  {
    "title": "Inception (2010) [1080p]",
    "infoHash": "abc123...",
    "magnetUrl": "magnet:?xt=urn:btih:...",
    "size": 2147483648,
    "seeders": 150,
    "leechers": 30,
    "provider": "YTS"
  }
]
```

## Using Drizzle Studio

View and edit your database with a GUI:

```bash
npm run db:studio
```

Opens at http://localhost:4983

## Common Issues

### "TMDB_API_KEY not configured"

Make sure you've added your TMDB API key to the `.env` file.

### Database errors

Delete the database and regenerate:
```bash
rm unifarr.db
npm run db:generate
```

### Port already in use

Change the port in `.env`:
```env
PORT=3001
```

## Next Steps

1. **Test with your media library**: Point the scanner at your actual movies/TV folder
2. **Explore the API**: Use tools like Postman or Thunder Client
3. **Build a frontend**: Use the API documentation to create a UI
4. **Add more providers**: Extend the provider system with additional torrent sites

## File Structure Overview

```
backend/
├── src/
│   ├── index.ts          # 👈 Start here - main entry point
│   ├── db/schema.ts      # 👈 Database structure
│   ├── lib/parser.ts     # 👈 Filename parsing logic
│   ├── routes/           # 👈 API endpoints
│   └── services/         # 👈 Business logic
└── drizzle/              # Generated SQL migrations
```

## Development Tips

### Hot Reload
The dev server watches for changes. Edit any `.ts` file and it auto-restarts.

### Debugging
Add `console.log()` anywhere in the code - output appears in terminal.

### Database Inspection
```bash
sqlite3 unifarr.db
.tables              # List tables
.schema files        # Show table structure
SELECT * FROM files; # Query data
```

### API Testing with curl

Save this as `test.sh`:
```bash
#!/bin/bash
BASE_URL="http://localhost:3000/api"

echo "Testing Unifarr API..."

echo "\n1. Health check"
curl $BASE_URL/../

echo "\n\n2. List providers"
curl $BASE_URL/providers

echo "\n\n3. Search TMDB"
curl "$BASE_URL/search/tmdb/movies?q=Matrix"

echo "\n\n4. Search torrents"
curl "$BASE_URL/providers/search?q=Matrix&type=movie"
```

Run: `chmod +x test.sh && ./test.sh`

## Production Deployment

For production use:

1. **Build the app**:
   ```bash
   npm run build
   ```

2. **Use PostgreSQL** (optional, more robust):
   - Install `pg` and `drizzle-orm/pg`
   - Update `drizzle.config.ts`
   - Set `DATABASE_PATH` to PostgreSQL connection string

3. **Set environment**:
   ```env
   NODE_ENV=production
   PORT=3000
   TMDB_API_KEY=...
   ```

4. **Run**:
   ```bash
   npm start
   ```

5. **Use a process manager**:
   ```bash
   npm install -g pm2
   pm2 start dist/index.js --name unifarr
   ```

## Support

- 📖 Full API docs: `docs/API.md`
- 🔍 Research notes: `docs/research.md`
- ✅ Completion summary: `docs/COMPLETION_SUMMARY.md`

---

Happy coding! 🎬🍿
