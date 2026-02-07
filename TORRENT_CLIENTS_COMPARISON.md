# Headless Torrent Clients - Porovnání a Integrace

## 🎯 Možnosti

### 1. **qBittorrent-nox** (Aktuálně používáte)
**Výhody:**
- ✅ Již implementováno
- ✅ Web API (REST-like)
- ✅ Stabilní, populární
- ✅ Docker dostupný
- ✅ Automatické category/tagging
- ✅ RSS feeds support

**Nevýhody:**
- ❌ Potřebuje běžet jako samostatný proces
- ❌ Connection failed error (není spuštěný)

**Setup:**
```bash
# Docker
docker run -d \
  --name=qbittorrent \
  -e PUID=1000 \
  -e PGID=1000 \
  -p 8080:8080 \
  -v /path/to/config:/config \
  -v /data/movies:/downloads/movies \
  -v /data/tvshows:/downloads/tvshows \
  linuxserver/qbittorrent:latest
```

**API Integrace:** ✅ Již hotovo v `qbittorrent.ts`

---

### 2. **WebTorrent** (Node.js Native)
**Výhody:**
- ✅ Pure JavaScript, žádné externí dependencies
- ✅ Vestavěné přímo do backendu
- ✅ Programmatický control
- ✅ Streamování (můžete začít přehrávat během stahování)
- ✅ Žádný extra proces

**Nevýhody:**
- ❌ Méně peers než BitTorrent mainnet
- ❌ Nestabilní pro long-term seeding
- ❌ Vyšší memory usage

**Implementace:**
```typescript
import WebTorrent from 'webtorrent';

const client = new WebTorrent();

client.add(magnetUri, { path: '/data/movies' }, (torrent) => {
  console.log('Downloading:', torrent.name);
  
  torrent.on('download', (bytes) => {
    console.log('Progress:', torrent.progress * 100 + '%');
  });
  
  torrent.on('done', () => {
    console.log('Download complete!');
  });
});
```

---

### 3. **Transmission** (Lightweight Daemon)
**Výhody:**
- ✅ Velmi lightweight (< 10MB RAM)
- ✅ Jednoduchá RPC API
- ✅ Stabilní, osvědčený
- ✅ Docker dostupný
- ✅ Dobrá dokumentace

**Nevýhody:**
- ❌ Web UI je basic (ale nepotřebujete)
- ❌ Méně features než qBittorrent

**Setup:**
```bash
# Docker
docker run -d \
  --name=transmission \
  -e PUID=1000 \
  -e PGID=1000 \
  -p 9091:9091 \
  -p 51413:51413 \
  -v /path/to/config:/config \
  -v /data:/downloads \
  linuxserver/transmission:latest
```

**API:**
```typescript
// RPC over HTTP
POST http://localhost:9091/transmission/rpc
{
  "method": "torrent-add",
  "arguments": {
    "filename": "magnet:?...",
    "download-dir": "/downloads/movies"
  }
}
```

---

### 4. **Aria2** (Multi-Protocol Downloader)
**Výhody:**
- ✅ Podporuje torrents, HTTP, FTP, Metalink
- ✅ Velmi rychlý
- ✅ JSON-RPC API
- ✅ Ultra lightweight

**Nevýhody:**
- ❌ Méně user-friendly než ostatní
- ❌ Složitější konfigurace

---

## 🏆 Doporučení pro Unifarr

### Scénář 1: **Opravit qBittorrent (Nejjednodušší)**
Váš backend už má implementaci, jen potřebujete spustit qBittorrent daemon.

**Kroky:**
1. Nainstalovat qBittorrent-nox nebo Docker container
2. Zkonfigurovat settings.json s správným host/port
3. Downloads center bude fungovat okamžitě

**Docker Compose příklad:**
```yaml
services:
  qbittorrent:
    image: linuxserver/qbittorrent:latest
    container_name: unifarr-qbittorrent
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=Europe/Prague
      - WEBUI_PORT=8080
    volumes:
      - ./qbittorrent-config:/config
      - /Users/ondrejzraly/test_media:/downloads
    ports:
      - "8080:8080"
      - "6881:6881"
      - "6881:6881/udp"
    restart: unless-stopped
```

### Scénář 2: **WebTorrent Integrace (Embeded)**
Přidat WebTorrent jako embedded torrent client přímo do Node.js backendu.

**Výhody:**
- Žádný externí proces
- Plná kontrola
- Snadný development

**Implementace:**
```bash
npm install webtorrent
```

Nový service: `backend/src/services/download/webtorrent.ts`

---

### Scénář 3: **Transmission jako alternativa**
Lightweight alternativa k qBittorrentu.

**Setup:**
```bash
brew install transmission-cli  # macOS
# nebo Docker
```

Nový adapter: `backend/src/services/download/transmission.ts`

---

## 📊 Srovnání

| Feature              | qBittorrent | WebTorrent | Transmission | Aria2 |
|----------------------|-------------|------------|--------------|-------|
| **Lightweight**      | ⭐⭐⭐       | ⭐⭐⭐⭐⭐   | ⭐⭐⭐⭐       | ⭐⭐⭐⭐⭐ |
| **Stability**        | ⭐⭐⭐⭐⭐   | ⭐⭐⭐       | ⭐⭐⭐⭐⭐     | ⭐⭐⭐⭐   |
| **Easy Integration** | ⭐⭐⭐⭐     | ⭐⭐⭐⭐⭐   | ⭐⭐⭐⭐       | ⭐⭐⭐    |
| **Features**         | ⭐⭐⭐⭐⭐   | ⭐⭐⭐       | ⭐⭐⭐⭐       | ⭐⭐⭐⭐   |
| **Performance**      | ⭐⭐⭐⭐     | ⭐⭐⭐⭐     | ⭐⭐⭐⭐       | ⭐⭐⭐⭐⭐ |

---

## 🚀 Akční Plán

### Krok 1: Quick Fix - Spustit qBittorrent
```bash
cd /Users/ondrejzraly/clawd/unifarr
# Přidat do docker-compose.yml nebo spustit lokálně
brew install qbittorrent  # nebo Docker
```

### Krok 2: Vylepšit Download Manager UI
- Real-time progress updates
- Better error handling
- Category management
- Speed limits

### Krok 3: (Optional) Přidat WebTorrent jako fallback
Pro single-file downloads nebo když qBittorrent není dostupný.

---

## 💡 Moje doporučení

**Pro Unifarr:**
1. **Opravit qBittorrent setup** - už to máte implementované, jen spustit daemon
2. **Docker Compose** - snadný deployment a restart
3. **Vylepšit UI** - lepší vizualizace stavu downloadů
4. **(Budoucnost)** Přidat WebTorrent jako embedded alternativu

**Proč qBittorrent:**
- ✅ Již implementováno
- ✅ Stabilní pro media soubory (large files)
- ✅ Automatické category management
- ✅ RSS support (budoucnost)
- ✅ Community plugins

Chceš abych:
1. **Vytvořil Docker Compose** pro qBittorrent?
2. **Implementoval WebTorrent** jako alternativu?
3. **Přidal Transmission adapter** jako lightweight option?
