# Prisma Migration Guide

Migrace Unifarr z Drizzle ORM na Prisma - hotová schema + ukázkové routes.

## ✅ Co je hotovo

1. **Prisma setup**
   - ✅ `prisma/schema.prisma` - kompletní schéma všech tabulek
   - ✅ `src/db/prisma.ts` - Prisma client s graceful shutdown
   - ✅ Dependencies nainstalované (`@prisma/client`, `@prisma/adapter-pg`, `pg`)
   - ✅ Generated Prisma Client

2. **Ukázková migrace**
   - ✅ `src/routes/auth.prisma.ts` - kompletní auth routes s Prisma

## 🔄 Drizzle → Prisma Mapping

### Query syntaxe

**Drizzle:**
```typescript
const user = await db.query.users.findFirst({
  where: eq(users.username, username),
});

const [userCountResult] = await db.select({ count: count() }).from(users);

await db.insert(users).values({ ... }).returning();
```

**Prisma:**
```typescript
const user = await prisma.user.findUnique({
  where: { username },
});

const userCount = await prisma.user.count();

const newUser = await prisma.user.create({
  data: { ... },
});
```

### Vztahy (relations)

**Drizzle:**
```typescript
const media = await db.query.media.findFirst({
  where: eq(mediaTable.id, id),
  with: {
    files: true,
    downloads: true,
  },
});
```

**Prisma:**
```typescript
const media = await prisma.media.findUnique({
  where: { id },
  include: {
    files: true,
    downloads: true,
  },
});
```

### Filtry

**Drizzle:**
```typescript
where: and(
  eq(mediaTable.type, 'tv'),
  eq(mediaTable.monitored, true)
)
```

**Prisma:**
```typescript
where: {
  type: 'tv',
  monitored: true,
}
```

## 📋 TODO: Migrovat routes

### 1. `src/routes/media.ts`
**Drizzle imports:**
```typescript
import { db } from '../db';
import { media as mediaTable } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
```

**Prisma imports:**
```typescript
import { prisma } from '../db/prisma';
```

**Klíčové změny:**
- `db.query.media.findMany()` → `prisma.media.findMany()`
- `db.insert(mediaTable).values()` → `prisma.media.create({ data: })`
- `db.update(mediaTable).set().where()` → `prisma.media.update({ where:, data: })`
- `eq(mediaTable.monitored, true)` → `{ monitored: true }`

### 2. `src/routes/files.ts`
**Změny:**
- File matching queries jednoduší (Prisma má lepší relation handling)
- `with: { matchCandidates: true }` → `include: { matchCandidates: true }`

### 3. `src/routes/downloads.ts`
**Změny:**
- Downloads status updates
- Progress tracking
- Media relation

### 4. `src/routes/providers.ts`
**Změny:**
- Provider CRUD operations
- Search history relations

### 5. `src/services/episode-monitor.ts`
**Současný problém:**
```typescript
const monitoredShows = await db.query.media.findMany({
  where: and(
    eq(mediaTable.type, 'tv'),
    eq(mediaTable.monitored, true)
  ),
});
```

**Prisma fix:**
```typescript
const monitoredShows = await prisma.media.findMany({
  where: {
    type: 'tv',
    monitored: true,
  },
});
```

### 6. `src/services/file-watcher.ts`
**Změny:**
- File matching candidate creation
- Media item lookup

## 🚀 Postup migrace

1. **Vyber jednu route/service**
2. **Vytvoř `.prisma.ts` verzi** (např. `media.prisma.ts`)
3. **Přepiš queries** podle příkladů výše
4. **Testuj** že funguje
5. **Přejmenuj:** `media.prisma.ts` → `media.ts` (přepiš originál)
6. **Opakuj** pro další soubory

## 🧪 Testing po migraci

```bash
# Vygeneruj nového klienta po změnách schématu
npx prisma generate

# Otevři Prisma Studio (GUI pro data)
npx prisma studio

# V Dockeru (produkce):
npm run build
docker-compose up -d
```

## 📦 Cleanup po dokončení

Když jsou všechny routes migrovány:

1. **Smaž Drizzle:**
```bash
npm uninstall drizzle-orm drizzle-kit postgres
rm -rf src/db/schema.ts
rm -rf src/db/index.ts
rm -rf drizzle/
```

2. **Update package.json scripts:**
```json
{
  "scripts": {
    "db:studio": "prisma studio",
    "db:migrate:dev": "prisma migrate dev",
    "db:migrate:deploy": "prisma migrate deploy",
    "db:generate": "prisma generate"
  }
}
```

3. **Update Dockerfile:**
```dockerfile
# Přidej před build:
COPY prisma ./prisma/
RUN npx prisma generate
```

## 🎯 Výhody po migraci

- ✅ **Jednodušší schema** - vše v `schema.prisma`
- ✅ **Type-safety** - auto-generated typy
- ✅ **Prisma Studio** - GUI pro debugging
- ✅ **Lepší DX** - IntelliSense pro relations
- ✅ **Migrace** - `prisma migrate dev` místo ručních SQL
- ✅ **Introspection** - `prisma db pull` pro sync se existující DB

## 🔍 Referenční materiály

- [Prisma Docs](https://www.prisma.io/docs)
- [Prisma Schema Reference](https://www.prisma.io/docs/concepts/components/prisma-schema)
- [Prisma Client API](https://www.prisma.io/docs/concepts/components/prisma-client)
- Ukázka: `src/routes/auth.prisma.ts` (kompletní migrace)

---

**Status:** Schema hotové, auth routes ukázka done. Zbývá migrovat: media, files, downloads, providers, services.
