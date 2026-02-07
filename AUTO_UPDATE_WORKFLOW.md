# 🔄 Automatický Update Workflow

## Jak to funguje

Push na `main` → vše se udělá automaticky! 🚀

```
┌─────────────┐
│  git push   │
│   to main   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────┐
│  GitHub Actions (2 workflows)   │
├─────────────────────────────────┤
│                                 │
│  1️⃣ Build Docker Images         │
│     ├─ Build backend            │
│     ├─ Build frontend           │
│     └─ Push to GHCR             │
│                                 │
│  2️⃣ Update Helm Chart           │
│     ├─ Bump version (1.0.X)    │
│     ├─ Package chart            │
│     ├─ Update gh-pages          │
│     └─ Commit version bump      │
│                                 │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  GitHub Pages (gh-pages)        │
│  https://mrpajzl.github.io/...  │
│                                 │
│  ├─ index.yaml (Helm repo)      │
│  ├─ unifarr-1.0.X.tgz          │
│  └─ icon.svg                    │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  TrueNAS SCALE                  │
│                                 │
│  ├─ Catalog auto-sync           │
│  ├─ Detect new version          │
│  └─ Show "Update" button        │
└─────────────────────────────────┘
```

## Workflow kroky

### 1. Vývoj a commit
```bash
# Edituj kód
vim backend/src/...
vim frontend/app/...

# Commit
git add .
git commit -m "feat: přidat novou funkci"
git push
```

### 2. Automatické buildy (GitHub Actions)

**Workflow: Build and Push Docker Images**
- Triggeruje se při každém push na main
- Sestaví backend + frontend images
- Publikuje na `ghcr.io/mrpajzl/unifarr/*:main`
- Trvá: ~2-3 minuty

**Workflow: Update Helm Chart**
- Triggeruje se také při push na main
- Automaticky zvýší verzi (1.0.1 → 1.0.2)
- Zabalí Helm chart
- Updatene `gh-pages` branch
- Commitne version bump zpět do main
- Trvá: ~30 sekund

### 3. TrueNAS auto-detect

TrueNAS kontroluje katalog každých **15 minut**:
- Detekuje novou verzi v `index.yaml`
- Zobrazí "Update Available" v UI
- Uživatel klikne **Update** → hotovo!

## Manuální trigger

Pokud chceš aktualizovat chart bez code změn:

```bash
# Spustit workflow manuálně
gh workflow run update-chart.yml
```

Nebo přes GitHub UI:
1. Actions → Update Helm Chart
2. Run workflow → Run workflow

## Version Scheme

- **Patch updates (1.0.X):** Auto-increment při každém push
- **Minor updates (1.X.0):** Manuálně edituj `Chart.yaml`
- **Major updates (X.0.0):** Manuálně + oznám breaking changes

## Co se děje při push

```bash
$ git push origin main
Counting objects...
Writing objects...
   
   # GitHub Actions start...
   
   ✓ Build backend image (2m 15s)
   ✓ Build frontend image (1m 45s)
   ✓ Push to GHCR (30s)
   
   ✓ Bump chart version 1.0.1 → 1.0.2 (5s)
   ✓ Package Helm chart (3s)
   ✓ Update gh-pages (10s)
   ✓ Commit version bump (5s)
   
Total: ~3 minutes
```

## Monitoring

**GitHub Actions status:**
```bash
gh run list --limit 5
```

**Chart repo status:**
```bash
curl https://mrpajzl.github.io/Unifarr/index.yaml | grep version
```

**TrueNAS catalog sync:**
- TrueNAS UI: Apps → Manage Catalogs → Unifarr
- Shows last sync time

## Rollback

Pokud něco pokazí:

```bash
# 1. Vrátit commit
git revert HEAD
git push

# 2. Nebo force push starší verzi
git reset --hard HEAD~1
git push --force

# GitHub Actions automaticky sestaví starou verzi
```

## Testing před push

```bash
# Lokální test
cd backend && npm run dev
cd frontend && npm run dev

# Docker test
docker compose up

# Helm test (dry-run)
helm install unifarr-test ./charts/unifarr --dry-run --debug
```

## Poznámky

- **Docker images** používají `:main` tag (vždy latest)
- **Helm chart** používá semver (1.0.1, 1.0.2, ...)
- **TrueNAS** trackuje Helm chart verzi
- Updates jsou **non-breaking** (bez downtime)

## Rychlý deploy cyklus

```bash
# 1. Udělej změny
vim backend/src/routes/media.ts

# 2. Test lokálně
npm run dev

# 3. Commit & push
git add .
git commit -m "fix: oprava media endpoint"
git push

# 4. Počkej 3 minuty
# GitHub Actions build + chart update

# 5. TrueNAS auto-detect (max 15 min)
# Nebo manuálně: Apps → Unifarr → Update

# 6. Profit! 🎉
```

---

**Všechno automatické!** Stačí pushovat na `main` a systém se postará o zbytek. 🚀
