# 📦 Rychlé přidání Unifarr katalogu do TrueNAS

## 1. Otevři TrueNAS Web UI

```
http://10.0.0.141
```

Login: tvoje admin credentials

## 2. Přidej katalog

**Apps** → **Manage Catalogs** → **Add Catalog**

**Vyplň:**
```
Name:             unifarr
Repository:       https://github.com/mrpajzl/Unifarr
Preferred Trains: charts
Branch:           gh-pages
```

**Klikni:** Save

## 3. Počkej na sync

- Katalog se synchronizuje (~30-60 sekund)
- Status: "Syncing..." → "Synced"
- Refresh stránku pokud trvá > 2 minuty

## 4. Instaluj Unifarr

**Apps** → **Available Applications**

- Vyhledej: **Unifarr**
- Klikni: **Install**

## 5. Konfigurace

### Network Configuration
```
Frontend Port: 3000  (nebo 3001 pokud je 3000 obsazený)
Backend Port:  3002  (nebo 3003 pokud je 3002 obsazený)
```

### Storage Configuration

**Movies:**
```
Host Path:  /mnt/storage/media/movies
```

**TV Shows:**
```
Host Path:  /mnt/storage/media/tvshows
```

**Downloads:**
```
Host Path:  /mnt/storage/media/downloads
```

**Database & Config:**
```
ixVolume (automatic)
Size: 10Gi
```

### Resources (optional)
```
CPU Limit:    2000m (2 cores)
Memory Limit: 2Gi
```

**Klikni:** Install (dole na stránce)

## 6. Počkej na deployment

- Status: "Deploying..." → "Active"
- Trvá: ~1-2 minuty
- Refresh Apps page pro update

## 7. První přístup

**Web UI:**
```
http://10.0.0.141:3000
```

**Login:**
```
Username: admin
Password: admin123
```

⚠️ **ZMĚŇ HESLO HNED!**
Settings → Users → Edit admin → Change password

## Troubleshooting

### Katalog se nesynchronizuje
```
Manage Catalogs → Unifarr → Refresh
```

### Port už je použitý
```
Edit app → Network → změň port na jiný
Frontend: 3000 → 3001
Backend:  3002 → 3003
```

### App se nespustí
```
Installed Applications → Unifarr → Logs
```

Hledej chyby typu:
- Permission denied → Fix ACL permissions
- Port in use → Změň port
- Image pull failed → Check internet connection

---

**Hotovo!** 🎉 Unifarr běží na `http://10.0.0.141:3000`
