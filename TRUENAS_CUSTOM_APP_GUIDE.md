# 🚀 Unifarr - TrueNAS Electric Eel Custom App

TrueNAS 25.04+ (Electric Eel) **zrušil custom katalogy**. Nahradilo to **Custom Apps** feature!

## Rychlá instalace (3 způsoby)

### Způsob 1: Custom App (doporučeno) 📦

1. **TrueNAS UI** → **Apps** → **Discover Apps**
2. Klikni **Custom App** (modrý button vpravo nahoře)
3. **Application Name:** `unifarr`
4. Klikni **Add** další container (potřebujeme 2)

#### Container 1: Backend
```
Container Name: unifarr-backend
Image: ghcr.io/mrpajzl/unifarr/backend:main
Pull Policy: Always

Port Forwarding:
  - Container Port: 3000
  - Node Port: 3002

Environment Variables:
  - NODE_ENV = production
  - MOVIES_PATH = /data/movies
  - TV_PATH = /data/tvshows
  - DOWNLOADS_PATH = /data/downloads

Storage:
  Host Path Volumes:
    - Host Path: /mnt/storage/media/movies
      Mount Path: /data/movies
    - Host Path: /mnt/storage/media/tvshows
      Mount Path: /data/tvshows
    - Host Path: /mnt/storage/media/downloads
      Mount Path: /data/downloads
  
  ixVolumes (automatické):
    - Mount Path: /app/data (config/database)
    - Mount Path: /app/downloads (torrenty)
```

#### Container 2: Frontend
```
Container Name: unifarr-frontend
Image: ghcr.io/mrpajzl/unifarr/frontend:main
Pull Policy: Always

Port Forwarding:
  - Container Port: 3000
  - Node Port: 3001

Environment Variables:
  - NUXT_PUBLIC_API_BASE = http://10.0.0.141:3002
```

5. **Deploy**
6. Otevři: http://10.0.0.141:3001

---

### Způsob 2: Install via YAML 📝

1. **Apps** → **Discover Apps** → **Custom App**
2. **Application Name:** `unifarr`
3. Přepni na **YAML Configuration** tab
4. Vlož obsah `truenas-custom-app.yml`:

```yaml
version: "3.8"

services:
  backend:
    image: ghcr.io/mrpajzl/unifarr/backend:main
    container_name: unifarr-backend
    restart: unless-stopped
    ports:
      - "3002:3000"
    environment:
      NODE_ENV: production
      MOVIES_PATH: /data/movies
      TV_PATH: /data/tvshows
      DOWNLOADS_PATH: /data/downloads
    volumes:
      - unifarr-data:/app/data
      - unifarr-downloads:/app/downloads
      - /mnt/storage/media/movies:/data/movies
      - /mnt/storage/media/tvshows:/data/tvshows
      - /mnt/storage/media/downloads:/data/downloads

  frontend:
    image: ghcr.io/mrpajzl/unifarr/frontend:main
    container_name: unifarr-frontend
    restart: unless-stopped
    ports:
      - "3001:3000"
    environment:
      NUXT_PUBLIC_API_BASE: http://10.0.0.141:3002
    depends_on:
      - backend

volumes:
  unifarr-data:
  unifarr-downloads:
```

5. **Deploy**

---

### Způsob 3: SSH + Docker Compose (už máš!) 🐳

Už běží na `/mnt/storage/apps/unifarr`!

**Update:**
```bash
ssh truenas_admin@10.0.0.141
cd /mnt/storage/apps/unifarr
echo 'Cx3250ftrm' | sudo -S docker compose pull
echo 'Cx3250ftrm' | sudo -S docker compose up -d
```

---

## Po instalaci

### První přístup
- **Web UI:** http://10.0.0.141:3001
- **Login:** `admin` / `admin123`
- ⚠️ **ZMĚŇ HESLO HNED!** Settings → Users → Edit admin

### Konfigurace
1. **Settings → Metadata**
   - Přidej TMDB API key (https://www.themoviedb.org/settings/api)

2. **Settings → Search Templates**
   - Webshare API key (pokud máš)
   - Trackers (SKTorrent, atd.)

3. **Library → Scan Library**
   - Najde tvoje existující filmy/seriály

4. **Library → TV Shows**
   - Enable monitoring
   - Auto-download nových epizod

---

## Management v TrueNAS

### Zobrazení v Apps UI
Pokud jsi použil Custom App (způsob 1 nebo 2):
- **Apps → Installed Applications**
- Vidíš **Unifarr** s ikonkou
- Start/Stop/Logs buttony
- Update button (když je nová verze)

### Update
**Custom App:**
- Apps → Installed → Unifarr → **Update**

**Docker Compose:**
```bash
cd /mnt/storage/apps/unifarr
sudo docker compose pull
sudo docker compose up -d
```

---

## Výhody Custom App vs Docker Compose

### Custom App (UI) ✅
- Viditelné v TrueNAS Apps UI
- Start/Stop/Restart buttony
- Logs v UI
- Auto-restart po reboot
- Port management v UI

### Docker Compose (SSH) ✅
- Rychlejší setup
- Verze kontrola přes git
- CLI update workflow
- Není závislý na UI

**Obě fungují! Vyber co se ti líbí.**

---

## Troubleshooting

### Port konflikty
Pokud je 3001/3002 obsazený:
- Změň v Custom App nebo docker-compose.yml
- Frontend: 3001 → 3003
- Backend: 3002 → 3004
- Uprav `NUXT_PUBLIC_API_BASE`

### Permission denied na media paths
```bash
# Fix ACL
sudo chown -R 568:568 /mnt/storage/media/{movies,tvshows,downloads}
```

### Logy
**Custom App:**
- Apps → Installed → Unifarr → **Logs**

**Docker Compose:**
```bash
cd /mnt/storage/apps/unifarr
sudo docker compose logs -f
```

---

## 🎯 Doporučení

Pro produkci: **Custom App** (způsob 1)
- Integrace s TrueNAS UI
- Přehledné v Apps

Pro vývoj/testování: **Docker Compose** (způsob 3)
- Rychlé updates
- Git workflow

**Můžeš mít obě!** Custom App pro produkci, Docker Compose pro testování.
