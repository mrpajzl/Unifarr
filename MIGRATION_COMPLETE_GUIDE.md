# Prisma Migration - Final Steps Guide

## 🎯 Current Status (2026-02-17 00:00)

**Completed:**
- ✅ Prisma schema with ALL tables (+ Settings model added!)
- ✅ Auth & Media routes fully working
- ✅ All imports changed (db → prisma)
- ✅ Table names fixed (plural → singular: files→file, users→user, etc.)
- ✅ Drizzle completely removed from dependencies
- ✅ 35+ files migrated

**Build Status:** 472 TypeScript errors remaining (down from 507)

**Remaining Work:** Fix query syntax in migrated files (~3-4 hours)

## 🔧 Common Patterns to Fix

### 1. Remove Drizzle `eq, and, or` usage

**Problem:**
```typescript
// ❌ Old (Drizzle)
const media = await prisma.media.findFirst({
  where: (media, { eq }) => eq(media.id, id),
});
```

**Solution:**
```typescript
// ✅ New (Prisma)
const media = await prisma.media.findUnique({
  where: { id },
});
```

**Find occurrences:**
```bash
grep -n "where: (" src/routes/*.ts src/services/*.ts
```

### 2. Update `.findMany()` with complex filters

**Problem:**
```typescript
// ❌ Old
const files = await prisma.file.findMany({
  where: (files, { eq, and }) => and(
    eq(files.matched, false),
    eq(files.mediaItemId, null)
  ),
});
```

**Solution:**
```typescript
// ✅ New
const files = await prisma.file.findMany({
  where: {
    matched: false,
    mediaItemId: null,
  },
});
```

### 3. Update `.update()` calls

**Problem:**
```typescript
// ❌ Old (doesn't exist in migrated code anymore but pattern is wrong)
await db.update(files)
  .set({ matched: true })
  .where(eq(files.id, fileId));
```

**Solution:**
```typescript
// ✅ New
await prisma.file.update({
  where: { id: fileId },
  data: { matched: true },
});
```

### 4. Update `.insert()` / `.create()`

**Problem:**
```typescript
// ❌ Old
const [newFile] = await db.insert(files).values({
  path: '/path',
  filename: 'test.mkv',
}).returning();
```

**Solution:**
```typescript
// ✅ New
const newFile = await prisma.file.create({
  data: {
    path: '/path',
    filename: 'test.mkv',
  },
});
```

### 5. Update `.deleteMany()` / `.delete()`

**Problem:**
```typescript
// ❌ Old
await db.delete(files).where(eq(files.mediaItemId, mediaId));
```

**Solution:**
```typescript
// ✅ New
await prisma.file.deleteMany({
  where: { mediaItemId: mediaId },
});
```

### 6. Fix relations (`.with` → `.include`)

**Problem:**
```typescript
// ❌ Old
const media = await prisma.media.findFirst({
  with: {
    files: true,
    downloads: true,
  },
});
```

**Solution:**
```typescript
// ✅ New
const media = await prisma.media.findFirst({
  include: {
    files: true,
    downloads: true,
  },
});
```

## 📁 Files Needing Manual Fixes

### High Priority (Core Functionality)

1. **src/routes/files.ts** - File management, matching
   - Lines with `where: (files, { eq, and })` pattern
   - `.findFirst()` calls
   - `.updateMany()` calls

2. **src/routes/downloads.ts** - Download tracking
   - WebTorrent + HTTP download queries
   - Status updates

3. **src/routes/episodes.ts** - Episode management
   - Season/episode queries
   - File relations

4. **src/routes/requests.ts** - Media requests
   - User relations
   - Status updates

5. **src/services/auto-matcher.ts** - Auto-matching logic
   - Complex file queries
   - TMDB lookups

### Medium Priority

6. **src/routes/search.ts** - Search functionality
7. **src/routes/users.ts** - User management  
8. **src/routes/webshare.ts** - Webshare integration
9. **src/services/folder-scanner.ts** - File scanning
10. **src/services/auto-identify.ts** - Auto-identification

### Low Priority (Can work without)

11. **src/routes/tmdb-auth.ts** - TMDB OAuth
12. **src/services/download/qbittorrent.ts** - qBittorrent client
13. **src/services/scanner/*.ts** - Advanced scanning

## 🚀 Quick Fix Workflow

```bash
# 1. Pick a file to fix
vim src/routes/files.ts

# 2. Find Drizzle patterns
/where: (

# 3. Replace with Prisma syntax (see patterns above)

# 4. Test build
npm run build

# 5. Fix errors one by one

# 6. When file compiles, test it
npm run dev
curl http://localhost:3002/api/files

# 7. Move to next file
```

## 🧪 Testing Strategy

### Test Checklist (After Each File Fix)

- [ ] File compiles (`npm run build`)
- [ ] Dev server starts (`npm run dev`)
- [ ] Endpoint responds (curl or Postman)
- [ ] No runtime errors in logs
- [ ] Data returned correctly

### Integration Test Commands

```bash
# Auth
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"mrpajzl","password":"Cx3250ftrm"}'

# Media
curl http://localhost:3002/api/media

# Files
curl http://localhost:3002/api/files

# Downloads
curl http://localhost:3002/api/downloads
```

## 📊 Estimated Time Per File

- **Simple routes** (users, requests): 10-15 min
- **Medium routes** (files, search): 20-30 min
- **Complex routes** (downloads, episodes): 30-45 min
- **Services** (auto-matcher, scanner): 20-40 min

**Total remaining:** ~3-4 hours of focused work

## 🎯 Recommended Order

1. **files.ts** (30 min) - Core functionality
2. **downloads.ts** (45 min) - Download management
3. **users.ts** (15 min) - User management
4. **requests.ts** (20 min) - Media requests
5. **search.ts** (25 min) - Search
6. **episodes.ts** (30 min) - Episode tracking
7. **auto-matcher.ts** (40 min) - Auto-matching
8. **folder-scanner.ts** (30 min) - File scanning
9. **Remaining services** (1 hour) - Everything else

## 💡 Pro Tips

1. **Use Prisma Studio** for testing queries:
   ```bash
   npm run db:studio
   # Opens GUI at http://localhost:5555
   ```

2. **Keep Drizzle backup files** for reference:
   ```bash
   # Example: compare old vs new
   diff src/routes/files.drizzle.backup src/routes/files.ts
   ```

3. **Test incrementally** - don't fix all files at once, test after each

4. **Use TypeScript errors** as guide:
   ```bash
   npm run build 2>&1 | grep "src/routes/files.ts"
   ```

5. **Commit frequently**:
   ```bash
   git add src/routes/files.ts
   git commit -m "fix: migrate files.ts to Prisma"
   ```

## 🐛 Common Errors & Solutions

### Error: `Property 'mediaItems' does not exist`
**Fix:** Change `prisma.mediaItems` → `prisma.media`

### Error: `Cannot find name 'eq'`
**Fix:** Remove Drizzle imports, use Prisma filter syntax

### Error: `Property 'files' does not exist. Did you mean 'file'?`
**Fix:** Change `prisma.files` → `prisma.file`

### Error: `implicitly has an 'any' type`
**Fix:** Add types or use `as any` temporarily

### Error: `'data' is of type 'unknown'`
**Fix:** Add `as any` or proper TypeScript type

## 📝 What's Already Working

- ✅ User authentication (login, register)
- ✅ Media CRUD (create, read, update, delete)
- ✅ Media bulk operations
- ✅ TMDB discovery
- ✅ Episode monitoring
- ✅ File watching
- ✅ Settings management

## 🎓 Learn More

- [Prisma Query Reference](https://www.prisma.io/docs/concepts/components/prisma-client/crud)
- [Prisma Relations](https://www.prisma.io/docs/concepts/components/prisma-client/relation-queries)
- [Prisma Studio](https://www.prisma.io/docs/concepts/components/prisma-studio)

---

**Good luck! The hard part is done - just systematic pattern replacement remains. 🚀**
