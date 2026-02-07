# 🚀 Instalace Unifarr přes TrueNAS Katalog

## Krok 1: Přidat katalog

1. Otevři TrueNAS web UI: `http://10.0.0.141`
2. Jdi na **Apps** → **Manage Catalogs**
3. Klikni **Add Catalog**
4. Vyplň:
   ```
   Name: unifarr
   Repository: https://github.com/mrpajzl/Unifarr
   Preferred Trains: charts
   Branch: gh-pages
   ```
5. **Save**

## Krok 2: Počkat na synchronizaci

- Katalog se synchronizuje (~30-60 sekund)
- Status uvidíš v **Manage Catalogs**
- Když je "Synced", můžeš pokračovat

## Krok 3: Instalovat Unifarr

1. Jdi na **Apps** → **Available Applications**
2. Vyhledej "**Unifarr**"
3. Klikni **Install**

## Krok 4: Konfigurace

### Storage (nejdůležitější!)

**Movies Path:**
```
Host Path: /mnt/storage/media/movies
Mount Path: /data/movies
```

**TV Shows Path:**
```
Host Path: /mnt/storage/media/tvshows
Mount Path: /data/tvshows
```

**Downloads Path:**
```
Host Path: /mnt/storage/media/downloads
Mount Path: /data/downloads
```

### Network

**Frontend Port:** `3000` (web UI)
**Backend Port:** `3002` (API)

⚠️ Pokud je port obsazený, změň na jiný (např. 3001, 3003)

### Resources (optional)

Ponech defaultní nebo uprav podle potřeby:
- CPU Limit: 2 cores
- Memory Limit: 2Gi

## Krok 5: Deploy

1. **Install** (dole na stránce)
2. Počkej na deployment (1-2 minuty)
3. Status uvidíš v **Installed Applications**

## Krok 6: První přístup

1. **Web UI:** `http://10.0.0.141:3000`
2. **Login:**
   - Username: `admin`
   - Password: `admin123`
3. **⚠️ ZMĚŇ HESLO OKAMŽITĚ!**
   - Settings → Users → Edit admin

## Co dál?

### 1. Nastavení TMDB API

Settings → Metadata:
- Přidej TMDB API key (získej na https://www.themoviedb.org/settings/api)

### 2. Přidat Search Providers

Settings → Search Templates:
- Torrenty jsou built-in (1337x, YTS)
- Pro Webshare: přidej API key

### 3. Skenovat knihovnu

Library → Scan Library:
- Najde existující soubory
- Automaticky matchne s TMDB

### 4. Přidat TV shows k monitorování

Library → TV Shows:
- Klikni na show
- Enable Monitoring
- Unifarr automaticky stahuje nové epizody!

## Troubleshooting

### Katalog se nesynchronizuje

```bash
# SSH do TrueNAS
ssh truenas_admin@10.0.0.141

# Check catalog status
midclt call catalog.query | jq '.[] | select(.label=="unifarr")'
```

### App se nespustí

Check logy:
```bash
k3s kubectl get pods -n ix-unifarr
k3s kubectl logs -n ix-unifarr -l app.kubernetes.io/name=unifarr
```

### Port conflict

Změň v Edit → Network Configuration

### Permission denied na media paths

```bash
# Fix ACL permissions
# TrueNAS UI: Storage → Pools → [pool] → Edit ACL
# Grant read/write to apps user (UID 568)
```

## Update

Když je nová verze:
1. **Apps** → **Installed**
2. Klikni **Update** na Unifarr
3. Review changes
4. Confirm

Nebo enable **Auto Update** v app settings.

## Podpora

- **GitHub Issues:** https://github.com/mrpajzl/Unifarr/issues
- **Dokumentace:** https://github.com/mrpajzl/Unifarr
- **Discord:** Coming soon! 🎉
