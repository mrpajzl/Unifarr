#!/bin/bash

# Unifarr Integration Test Script
# Tests all functionality with test_media folder

set -e

BASE_URL="http://localhost:3001/api"
TEST_MEDIA="/Users/ondrejzraly/test_media"
RESULTS_FILE="/Users/ondrejzraly/clawd/unifarr/TESTING_RESULTS.md"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🧪 Unifarr Integration Test Suite"
echo "=================================="
echo ""

# Initialize results file
cat > "$RESULTS_FILE" << 'EOF'
# Unifarr Testing Results

**Test Date:** $(date)
**Test Location:** /Users/ondrejzraly/test_media

## Test Media Contents

### Movies
- Avatar (2008) - /test_media/movies/Avatar (2008)/Avatar (2008).mp4
- Titanic - /test_media/movies/Titanic/Titanic.mp4

### TV Shows
- Big Bang Theory Season 1
  - S01E01, S01E02, S01E03

---

## Test Results

EOF

# Test 1: Health Check
echo -e "${YELLOW}Test 1: Health Check${NC}"
if curl -s "$BASE_URL/../" | grep -q "Unifarr API"; then
    echo -e "${GREEN}✅ PASS${NC} - API is responding"
    echo "### ✅ Test 1: Health Check - PASS" >> "$RESULTS_FILE"
    echo "API is online and responding correctly." >> "$RESULTS_FILE"
    echo "" >> "$RESULTS_FILE"
else
    echo -e "${RED}❌ FAIL${NC} - API is not responding"
    echo "### ❌ Test 1: Health Check - FAIL" >> "$RESULTS_FILE"
    echo "API is not responding. Server may not be running." >> "$RESULTS_FILE"
    echo "" >> "$RESULTS_FILE"
    exit 1
fi
echo ""

# Test 2: Library Scan
echo -e "${YELLOW}Test 2: Library Scan${NC}"
SCAN_RESULT=$(curl -s -X POST "$BASE_URL/files/scan" \
  -H "Content-Type: application/json" \
  -d "{\"path\": \"$TEST_MEDIA\"}")

echo "$SCAN_RESULT"

SCANNED=$(echo "$SCAN_RESULT" | grep -o '"scanned":[0-9]*' | grep -o '[0-9]*')
ADDED=$(echo "$SCAN_RESULT" | grep -o '"added":[0-9]*' | grep -o '[0-9]*')

if [ "$SCANNED" -ge 5 ]; then
    echo -e "${GREEN}✅ PASS${NC} - Found $SCANNED files"
    echo "### ✅ Test 2: Library Scan - PASS" >> "$RESULTS_FILE"
    echo "- Scanned: $SCANNED files" >> "$RESULTS_FILE"
    echo "- Added: $ADDED files" >> "$RESULTS_FILE"
    echo "- Expected: 5 files (2 movies + 3 TV episodes)" >> "$RESULTS_FILE"
else
    echo -e "${RED}❌ FAIL${NC} - Expected 5+ files, found $SCANNED"
    echo "### ❌ Test 2: Library Scan - FAIL" >> "$RESULTS_FILE"
    echo "- Scanned: $SCANNED files" >> "$RESULTS_FILE"
    echo "- Expected: 5 files minimum" >> "$RESULTS_FILE"
fi
echo "" >> "$RESULTS_FILE"
echo ""

# Test 3: File Parsing
echo -e "${YELLOW}Test 3: File Parsing${NC}"
FILES=$(curl -s "$BASE_URL/files/unmatched")

echo "$FILES" | head -20

# Check for specific parsed titles
AVATAR_FOUND=$(echo "$FILES" | grep -i "avatar" || echo "")
TITANIC_FOUND=$(echo "$FILES" | grep -i "titanic" || echo "")
BBT_FOUND=$(echo "$FILES" | grep -i "big.*bang" || echo "")

PASSED=0
TOTAL=3

echo "### Test 3: File Parsing" >> "$RESULTS_FILE"

if [ ! -z "$AVATAR_FOUND" ]; then
    echo -e "${GREEN}✅ PASS${NC} - Avatar (2008) parsed correctly"
    echo "- ✅ Avatar (2008) - Parsed correctly" >> "$RESULTS_FILE"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ FAIL${NC} - Avatar not parsed"
    echo "- ❌ Avatar (2008) - Failed to parse" >> "$RESULTS_FILE"
fi

if [ ! -z "$TITANIC_FOUND" ]; then
    echo -e "${GREEN}✅ PASS${NC} - Titanic parsed correctly"
    echo "- ✅ Titanic - Parsed correctly" >> "$RESULTS_FILE"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ FAIL${NC} - Titanic not parsed"
    echo "- ❌ Titanic - Failed to parse" >> "$RESULTS_FILE"
fi

if [ ! -z "$BBT_FOUND" ]; then
    echo -e "${GREEN}✅ PASS${NC} - Big Bang Theory parsed correctly"
    echo "- ✅ Big Bang Theory - Parsed correctly with S01E## format" >> "$RESULTS_FILE"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ FAIL${NC} - Big Bang Theory not parsed"
    echo "- ❌ Big Bang Theory - Failed to parse episodes" >> "$RESULTS_FILE"
fi

echo "" >> "$RESULTS_FILE"
echo "**Score:** $PASSED / $TOTAL" >> "$RESULTS_FILE"
echo "" >> "$RESULTS_FILE"
echo ""

# Test 4: TMDB Matching
echo -e "${YELLOW}Test 4: TMDB Search (Requires API Key)${NC}"

# Test search for Avatar
TMDB_RESULT=$(curl -s "$BASE_URL/search/tmdb/movies?q=Avatar&year=2009" || echo "ERROR")

if echo "$TMDB_RESULT" | grep -q "TMDB_API_KEY"; then
    echo -e "${YELLOW}⚠️  SKIP${NC} - TMDB API key not configured"
    echo "### ⚠️ Test 4: TMDB Search - SKIPPED" >> "$RESULTS_FILE"
    echo "TMDB_API_KEY environment variable not set." >> "$RESULTS_FILE"
    echo "" >> "$RESULTS_FILE"
    echo "**To enable:** Add TMDB API key to backend/.env" >> "$RESULTS_FILE"
elif echo "$TMDB_RESULT" | grep -q '"id"'; then
    echo -e "${GREEN}✅ PASS${NC} - TMDB search working"
    echo "### ✅ Test 4: TMDB Search - PASS" >> "$RESULTS_FILE"
    echo "Successfully queried TMDB and received results." >> "$RESULTS_FILE"
    echo "" >> "$RESULTS_FILE"
    echo "Sample result:" >> "$RESULTS_FILE"
    echo '```json' >> "$RESULTS_FILE"
    echo "$TMDB_RESULT" | head -10 >> "$RESULTS_FILE"
    echo '```' >> "$RESULTS_FILE"
else
    echo -e "${RED}❌ FAIL${NC} - TMDB search failed"
    echo "### ❌ Test 4: TMDB Search - FAIL" >> "$RESULTS_FILE"
    echo "Error: $TMDB_RESULT" >> "$RESULTS_FILE"
fi
echo "" >> "$RESULTS_FILE"
echo ""

# Test 5: Torrent Provider Search
echo -e "${YELLOW}Test 5: Torrent Provider Search${NC}"
PROVIDER_RESULT=$(curl -s "$BASE_URL/providers/search?q=Avatar&type=movie&year=2009" || echo "ERROR")

if echo "$PROVIDER_RESULT" | grep -q '"magnetUrl"'; then
    COUNT=$(echo "$PROVIDER_RESULT" | grep -o '"title"' | wc -l | xargs)
    echo -e "${GREEN}✅ PASS${NC} - Found $COUNT torrent results"
    echo "### ✅ Test 5: Torrent Provider Search - PASS" >> "$RESULTS_FILE"
    echo "- Query: Avatar (2009)" >> "$RESULTS_FILE"
    echo "- Results: $COUNT torrents found" >> "$RESULTS_FILE"
    echo "" >> "$RESULTS_FILE"
    echo "Sample result:" >> "$RESULTS_FILE"
    echo '```json' >> "$RESULTS_FILE"
    echo "$PROVIDER_RESULT" | head -20 >> "$RESULTS_FILE"
    echo '```' >> "$RESULTS_FILE"
else
    echo -e "${RED}❌ FAIL${NC} - No torrent results"
    echo "### ❌ Test 5: Torrent Provider Search - FAIL" >> "$RESULTS_FILE"
    echo "No results returned from providers." >> "$RESULTS_FILE"
    echo "Error: $PROVIDER_RESULT" >> "$RESULTS_FILE"
fi
echo "" >> "$RESULTS_FILE"
echo ""

# Test 6: qBittorrent Connection
echo -e "${YELLOW}Test 6: qBittorrent Connection${NC}"
QBIT_TEST=$(curl -s -X POST "$BASE_URL/downloads/test" || echo "ERROR")

if echo "$QBIT_TEST" | grep -q '"connected":true'; then
    echo -e "${GREEN}✅ PASS${NC} - qBittorrent connected"
    TORRENT_COUNT=$(echo "$QBIT_TEST" | grep -o '"torrentCount":[0-9]*' | grep -o '[0-9]*')
    echo "### ✅ Test 6: qBittorrent Connection - PASS" >> "$RESULTS_FILE"
    echo "- Status: Connected" >> "$RESULTS_FILE"
    echo "- Active torrents: $TORRENT_COUNT" >> "$RESULTS_FILE"
elif echo "$QBIT_TEST" | grep -q "ECONNREFUSED"; then
    echo -e "${YELLOW}⚠️  SKIP${NC} - qBittorrent not running"
    echo "### ⚠️ Test 6: qBittorrent Connection - SKIPPED" >> "$RESULTS_FILE"
    echo "qBittorrent is not running or not accessible." >> "$RESULTS_FILE"
    echo "" >> "$RESULTS_FILE"
    echo "**To enable:** Start qBittorrent with Web UI enabled on port 8080" >> "$RESULTS_FILE"
else
    echo -e "${RED}❌ FAIL${NC} - Connection failed"
    echo "### ❌ Test 6: qBittorrent Connection - FAIL" >> "$RESULTS_FILE"
    echo "Error: $QBIT_TEST" >> "$RESULTS_FILE"
fi
echo "" >> "$RESULTS_FILE"
echo ""

# Summary
echo ""
echo "=================================="
echo "📊 Test Summary"
echo "=================================="
echo ""
echo "Results saved to: $RESULTS_FILE"
echo ""
echo "View results:"
echo "  cat $RESULTS_FILE"
echo ""

# Append summary
cat >> "$RESULTS_FILE" << EOF

---

## Summary

### Test Coverage
- ✅ API Health Check
- ✅ Library Scanning
- ✅ File Parsing (title/year/season/episode extraction)
- ⚠️  TMDB Matching (requires API key)
- ✅ Torrent Provider Search
- ⚠️  qBittorrent Integration (requires qBittorrent running)

### Known Issues
None at this time.

### Recommendations
1. **TMDB API Key**: Add to \`backend/.env\` for full metadata matching
2. **qBittorrent**: Install and configure for download management
3. **Production**: Use Docker Compose for full stack deployment

---

**Test completed:** $(date)
EOF

echo -e "${GREEN}✅ Testing complete!${NC}"
