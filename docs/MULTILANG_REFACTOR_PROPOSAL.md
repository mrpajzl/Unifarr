# 🌍 Multi-Language Metadata Refactor - Design Proposal

**Datum:** 2026-02-19  
**Problém:** Současný systém ukládá metadata v 2 jazycích (EN + CZ) do DB, nelze měnit jazyk per-user  
**Cíl:** Multi-user support s volitelným jazykem bez TMDB API rate limit ban

---

## 📊 Současný Stav (Problémy)

### **Jak to funguje teď:**
```typescript
// Při přidání media:
const multiData = await tmdb.getMovieDetailsMultilang(tmdbId);
const { en, localized } = multiData; // localized = CZ hardcoded

await prisma.media.create({
  data: {
    title: localized.title,        // "Vetřelec" (CZ)
    titleEn: en.title,              // "Alien" (EN)
    overview: localized.overview,   // CZ popis
    overviewEn: en.overview,        // EN popis
  }
});
```

### **Problémy:**
1. ❌ **Hardcoded CZ** - všichni uživatelé vidí česky
2. ❌ **Nelze změnit jazyk** - i když user chce DE/FR/ES
3. ❌ **Duplicate fetches** - když někdo chce jiný jazyk, fetch znovu
4. ❌ **DB overhead** - 2 title/overview columns per media
5. ❌ **TMDB rate limit risk** - re-fetch stejných dat

---

## 🎯 Návrh Řešení: Hybrid Cache System

### **Architektura:**

```
┌─────────────────────────────────────────────────────────────┐
│ TMDB API (40 req/10s limit)                                 │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ Fetch on-demand
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ Translation Cache (DB Table)                                │
│ - media_id, language, title, overview                       │
│ - cached_at, expires_at (TTL: 7 days)                       │
│ - Auto-cleanup stale entries                                │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ Serve to users
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ User Preferences                                            │
│ - user_id, preferred_language (en, cs, de, fr, es...)      │
└─────────────────────────────────────────────────────────────┘
```

### **Klíčové Principy:**

1. ✅ **Base Language: EN (vždy v DB)**
   - `media.title` = English title (fallback)
   - `media.overview` = English overview
   - Použití: folder names, matching, fallback

2. ✅ **Translations: Separate Cache Table**
   - Lazy loading - fetch when needed
   - TTL: 7 dní (metadata se nemění často)
   - Auto-cleanup expired entries

3. ✅ **Rate Limit Protection**
   - Global request queue (max 30 req/10s - buffer pod 40 limit)
   - Per-media-language cooldown (1h)
   - Exponential backoff on 429 errors

4. ✅ **Fallback Chain**
   - User preference (e.g., "de") → cache → fetch
   - If fetch fails → fallback to EN
   - Never block user on translation failure

---

## 🗄️ Database Schema

### **Nová Tabulka: media_translations**

```prisma
model MediaTranslation {
  id          Int       @id @default(autoincrement())
  mediaId     Int       @map("media_id")
  language    String    // ISO 639-1 (en, cs, de, fr, es, ...)
  title       String
  overview    String?   @db.Text
  tagline     String?
  cachedAt    DateTime  @default(now()) @map("cached_at")
  expiresAt   DateTime  @map("expires_at")

  media       Media     @relation(fields: [mediaId], references: [id], onDelete: Cascade)

  @@unique([mediaId, language])
  @@index([expiresAt]) // Pro cleanup stale entries
  @@map("media_translations")
}
```

### **Upravená Tabulka: media**

```prisma
model Media {
  id                Int       @id @default(autoincrement())
  type              String
  
  // ✅ Base metadata (ALWAYS ENGLISH - fallback + folder names)
  title             String    // English title
  originalTitle     String?   @map("original_title") // TMDB original (může být JP, KR, etc.)
  overview          String?   @db.Text // English overview
  tagline           String?   // English tagline
  
  // ❌ REMOVE: titleEn, overviewEn (redundant - title IS English now)
  
  // ... rest unchanged
  year              Int?
  tmdbId            Int?      @map("tmdb_id")
  imdbId            String?   @map("imdb_id")
  // ...
  
  translations      MediaTranslation[]
  
  @@map("media")
}
```

### **User Preferences**

```prisma
model User {
  id                Int      @id @default(autoincrement())
  username          String   @unique
  password          String
  role              String   @default("user")
  approved          Boolean  @default(false)
  
  // ✅ NEW: Language preference
  preferredLanguage String   @default("en") @map("preferred_language") // ISO 639-1
  
  createdAt         DateTime @default(now()) @map("created_at")
  
  @@map("users")
}
```

---

## 🔄 API Flow

### **Scenario 1: User otevře detail filmu**

```typescript
// Request: GET /api/media/123
// Headers: Authorization: Bearer <token>

// 1. Authenticate user → get preferredLanguage (e.g., "cs")
const user = await authenticateUser(token);
const lang = user.preferredLanguage; // "cs"

// 2. Fetch media base data (EN)
const media = await prisma.media.findUnique({
  where: { id: 123 },
  include: { translations: true }
});

// 3. Check cache for CS translation
const cached = media.translations.find(t => 
  t.language === lang && t.expiresAt > new Date()
);

let localizedData;

if (cached) {
  // ✅ Cache hit - použít cached translation
  localizedData = {
    title: cached.title,
    overview: cached.overview,
    tagline: cached.tagline,
  };
} else {
  // ❌ Cache miss - fetch z TMDB
  try {
    const tmdbData = await fetchWithRateLimit(
      `/movie/${media.tmdbId}?language=${lang}`
    );
    
    // Save to cache (TTL: 7 days)
    await prisma.mediaTranslation.upsert({
      where: { 
        mediaId_language: { mediaId: media.id, language: lang }
      },
      create: {
        mediaId: media.id,
        language: lang,
        title: tmdbData.title,
        overview: tmdbData.overview,
        tagline: tmdbData.tagline,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      update: {
        title: tmdbData.title,
        overview: tmdbData.overview,
        tagline: tmdbData.tagline,
        cachedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    
    localizedData = {
      title: tmdbData.title,
      overview: tmdbData.overview,
      tagline: tmdbData.tagline,
    };
  } catch (error) {
    // ⚠️ Fallback to English
    console.warn(`Failed to fetch ${lang} translation:`, error);
    localizedData = {
      title: media.title,
      overview: media.overview,
      tagline: media.tagline,
    };
  }
}

// 4. Return merged data
return {
  ...media,
  title: localizedData.title,
  overview: localizedData.overview,
  tagline: localizedData.tagline,
  _baseTitle: media.title, // EN fallback pro debugging
  _language: lang,
};
```

---

## 🛡️ Rate Limit Protection

### **TMDB Limits:**
- **Official:** 40 requests / 10 seconds
- **Safe buffer:** 30 requests / 10 seconds (75% usage)

### **Implementation: Request Queue**

```typescript
// services/tmdb-rate-limiter.ts

import pQueue from 'p-queue';

class TMDBRateLimiter {
  private queue: pQueue;
  private requestTimestamps: number[] = [];
  private readonly MAX_REQUESTS = 30;
  private readonly WINDOW_MS = 10_000;

  constructor() {
    this.queue = new pQueue({
      concurrency: 5, // Max 5 concurrent
      interval: 1000, // 1 sec
      intervalCap: 5, // Max 5 per second
    });
  }

  async fetch<T>(url: string): Promise<T> {
    return this.queue.add(async () => {
      // Check rate limit
      const now = Date.now();
      this.requestTimestamps = this.requestTimestamps.filter(
        ts => now - ts < this.WINDOW_MS
      );

      if (this.requestTimestamps.length >= this.MAX_REQUESTS) {
        const oldestRequest = this.requestTimestamps[0];
        const waitMs = this.WINDOW_MS - (now - oldestRequest);
        console.warn(`⏳ Rate limit hit, waiting ${waitMs}ms`);
        await new Promise(resolve => setTimeout(resolve, waitMs));
      }

      // Make request
      this.requestTimestamps.push(Date.now());
      
      const response = await fetch(url);
      
      if (response.status === 429) {
        // Exponential backoff
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
        console.error(`⚠️ TMDB 429 - Rate limit exceeded, retry after ${retryAfter}s`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        return this.fetch<T>(url); // Retry
      }

      return response.json();
    }) as Promise<T>;
  }
}

export const tmdbLimiter = new TMDBRateLimiter();
```

### **Per-Media-Language Cooldown**

```typescript
// Prevent spamming same media in same language
const cooldownKey = `tmdb:${mediaId}:${language}`;
const lastFetch = await redis.get(cooldownKey);

if (lastFetch && Date.now() - parseInt(lastFetch) < 3600_000) {
  // Fetched within last hour - skip
  throw new Error('Translation recently fetched, using cache');
}

await redis.set(cooldownKey, Date.now().toString(), 'EX', 3600);
```

---

## 📦 Pre-warming Strategy

### **Popular Languages Pre-fetch**

Při přidání nového media, automaticky fetchnout top 3 jazyky:

```typescript
// services/media-translation-prewarmer.ts

const POPULAR_LANGUAGES = ['en', 'cs', 'de']; // Top 3 dle usage

export async function prewarmTranslations(mediaId: number, tmdbId: number, type: string) {
  for (const lang of POPULAR_LANGUAGES) {
    try {
      await fetchAndCacheTranslation(mediaId, tmdbId, type, lang);
      await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay mezi requests
    } catch (error) {
      console.warn(`Failed to prewarm ${lang} for media ${mediaId}:`, error);
    }
  }
}
```

**Benefits:**
- ✅ První 3 jazyky okamžitě dostupné (no delay)
- ✅ Většina userů (EN, CS, DE) má instant response
- ✅ Kontrolovaný rate (3 req per media = safe)

---

## 🧹 Cache Cleanup Strategy

### **Auto-cleanup stale translations**

```typescript
// services/translation-cleanup.ts

export async function cleanupStaleTranslations() {
  const deleted = await prisma.mediaTranslation.deleteMany({
    where: {
      expiresAt: { lt: new Date() }
    }
  });
  
  console.log(`🧹 Cleaned up ${deleted.count} stale translations`);
}

// Run daily via cron
setInterval(cleanupStaleTranslations, 24 * 60 * 60 * 1000);
```

### **LRU-style cleanup (optional)**

Pokud DB roste příliš:

```typescript
// Keep only last 1000 translations per language
const languageCounts = await prisma.mediaTranslation.groupBy({
  by: ['language'],
  _count: { id: true },
});

for (const { language, _count } of languageCounts) {
  if (_count.id > 1000) {
    // Delete oldest 20%
    const toDelete = await prisma.mediaTranslation.findMany({
      where: { language },
      orderBy: { cachedAt: 'asc' },
      take: Math.floor(_count.id * 0.2),
      select: { id: true },
    });
    
    await prisma.mediaTranslation.deleteMany({
      where: { id: { in: toDelete.map(t => t.id) } },
    });
  }
}
```

---

## 🚀 Migration Plan

### **Phase 1: Schema Migration (Breaking Change)**

```bash
# 1. Create migration
cd backend
npx prisma migrate dev --name multilang_refactor

# Generated SQL:
CREATE TABLE media_translations (
  id SERIAL PRIMARY KEY,
  media_id INTEGER NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  language VARCHAR(10) NOT NULL,
  title TEXT NOT NULL,
  overview TEXT,
  tagline TEXT,
  cached_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  UNIQUE(media_id, language)
);

CREATE INDEX idx_translations_expires ON media_translations(expires_at);

ALTER TABLE media RENAME COLUMN title TO title_old;
ALTER TABLE media RENAME COLUMN title_en TO title;
ALTER TABLE media DROP COLUMN overview_en;
ALTER TABLE media ADD COLUMN tagline TEXT;

ALTER TABLE users ADD COLUMN preferred_language VARCHAR(10) DEFAULT 'en';
```

### **Phase 2: Data Migration**

```typescript
// scripts/migrate-translations.ts

import { prisma } from './db/prisma';

async function migrateExistingTranslations() {
  const allMedia = await prisma.media.findMany({
    select: { id: true, title_old: true, overview: true },
  });

  for (const media of allMedia) {
    if (media.title_old && media.title_old !== media.title) {
      // CZ translation exists
      await prisma.mediaTranslation.create({
        data: {
          mediaId: media.id,
          language: 'cs',
          title: media.title_old,
          overview: media.overview,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
      });
    }
  }

  console.log(`✅ Migrated ${allMedia.length} media translations`);
}

migrateExistingTranslations();
```

### **Phase 3: Code Refactor**

1. ✅ Update `routes/media.ts` - remove `getMovieDetailsMultilang()`
2. ✅ Add `services/translation-manager.ts`
3. ✅ Update frontend API calls - pass user language preference
4. ✅ Add user settings page for language selection

---

## 📊 Performance Estimates

### **Cache Hit Ratio Projections:**

| Scenario | Cache Hit % | TMDB API Calls/Day |
|----------|-------------|---------------------|
| **Single user (CS)** | ~95% | ~20 (new content) |
| **5 users (CS, EN, DE)** | ~85% | ~60 |
| **20 users (10 languages)** | ~60% | ~200 |
| **With pre-warming** | ~90% | ~50 |

**TMDB Daily Limit:** ~345,600 requests/day (40/10s × 86400s)  
**Safe Usage:** ~259,200 requests/day (30/10s buffer)

**Conclusion:** Even with 100 users and 20 languages, we're safe.

---

## ✅ Benefits Summary

| Feature | Before | After |
|---------|--------|-------|
| **Multi-user languages** | ❌ No (CZ only) | ✅ Yes (any language) |
| **DB columns per media** | 6 (title, titleEn, overview, overviewEn...) | 3 (title, overview, tagline) |
| **Translation storage** | Inline (bloat) | Separate table (clean) |
| **TMDB API calls** | High (re-fetch on each add) | Low (cache + TTL) |
| **Rate limit protection** | ❌ No | ✅ Queue + cooldown |
| **Fallback strategy** | ❌ Hard fail | ✅ EN fallback |
| **Cache invalidation** | ❌ Manual | ✅ Auto (7-day TTL) |

---

## 🎯 Recommendation

**Implement this refactor:**
- ✅ Solves multi-user problem
- ✅ Reduces DB bloat
- ✅ Protects against TMDB ban
- ✅ Scalable (100+ users safe)
- ✅ Graceful degradation (EN fallback)

**Estimated work:** 6-8 hours  
**Breaking change:** Yes (requires migration)  
**Risk:** Medium (DB migration, but reversible)

Chceš abych to začal implementovat?
