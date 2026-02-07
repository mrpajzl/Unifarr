# 🔐 Authentication & Request System - User Guide

## ✨ Co je nové?

Unifarr nyní podporuje:
- 👥 **Multi-user systém** - Admin a běžní uživatelé
- 🎫 **Request system** - Uživatelé můžou žádat o filmy/seriály (Overseerr-style)
- 🔒 **Role-based access** - Admin má plný přístup, uživatelé jen request

---

## 🚀 První spuštění

### 1. Registrace prvního uživatele (Admin)

První user, který se zaregistruje, automaticky dostane admin roli.

```bash
# Jdi na http://localhost:3001/login
# Klikni "Register" a zadej:
Username: admin
Password: admin123  # (nebo cokoli 6+ znaků)
```

✅ **První user = automaticky admin!**

### 2. Přidání dalších uživatelů

Další uživatelé se registrují stejně, ale dostanou roli `user`:

```bash
# Další users (rodina, kámoši):
Username: petr
Password: petr123

Username: jana
Password: jana123
```

---

## 👤 User vs Admin - Co kdo vidí?

### 🔧 **Admin** (ty)
- ✅ Discover - browse content
- ✅ **Requests** - schvaluje/zamítá požadavky
- ✅ Library (Movies, TV Shows)
- ✅ Downloads
- ✅ Unmatched files
- ✅ Settings
- ✅ **Search & Download** - na detail stránce může stahovat torrenty

**Admin flow:**
1. User vytvoří request
2. Admin vidí request v **Requests** stránce
3. Admin klikne **Approve** nebo **Deny** (+ optional note)
4. Approved request → Admin jde na Discover, najde film, klikne "Search & Download"

### 👥 **User** (rodina, kámoši)
- ✅ Discover - browse content
- ✅ **My Requests** - sleduje svoje požadavky
- ❌ Nemá přístup k Library, Downloads, Settings
- ❌ Nemůže přímo stahovat - jen žádat

**User flow:**
1. Jde na **Discover**
2. Najde film/seriál
3. Klikne **Request** (může přidat poznámku)
4. Sleduje status v **My Requests** (Pending → Approved → Downloaded)

---

## 🎬 Request Flow (krok za krokem)

### User vyžádá film:

1. Login jako `petr`
2. Jdi na **Discover**
3. Vyhledej např. "Dune 2"
4. Klikni na detail
5. Klikni **Request** (optional: přidej poznámku)
6. ✅ Request odeslán!

### Admin schválí:

1. Login jako `admin`
2. Jdi na **Requests** (vidíš notifikaci v menu)
3. Uvidíš:
   ```
   🎬 Dune 2 (2024)
   Requested by: petr
   User note: "Prosím, chci to vidět!"
   
   [Approve] [Deny]
   ```
4. Klikni **Approve** (+ optional admin note: "OK, stahuji")
5. ✅ Request status → Approved

### Admin stáhne:

1. Jdi na **Discover**
2. Najdi "Dune 2"
3. Klikni **Search & Download**
4. Vyber torrent
5. Stáhni
6. ✅ Status se automaticky neaktualizuje (to musíš dodělat ručně nebo přes webhook)

---

## 🔄 Request stavy

- **Pending** 🟡 - Čeká na schválení
- **Approved** 🟢 - Schváleno, admin má stáhnout
- **Denied** 🔴 - Zamítnuto (+ důvod v admin note)
- **Downloaded** 🔵 - Staženo (zatím se nenastavuje automaticky)

---

## 📝 API Endpoints (pro testování)

### Auth

```bash
# Register
POST /api/auth/register
{"username": "admin", "password": "admin123"}

# Login
POST /api/auth/login
{"username": "admin", "password": "admin123"}
# → vrací token

# Get current user
GET /api/auth/me
Header: Authorization: Bearer <token>
```

### Requests

```bash
# List requests (admin = všechny, user = jen svoje)
GET /api/requests
Header: Authorization: Bearer <token>

# Create request
POST /api/requests
Header: Authorization: Bearer <token>
{
  "tmdbId": 550,
  "type": "movie",
  "title": "Fight Club",
  "year": 1999
}

# Approve (admin only)
PATCH /api/requests/:id/approve
Header: Authorization: Bearer <token>
{"adminNote": "OK, stahuji"}

# Deny (admin only)
PATCH /api/requests/:id/deny
Header: Authorization: Bearer <token>
{"adminNote": "Není k dispozici"}

# Delete
DELETE /api/requests/:id
Header: Authorization: Bearer <token>
```

---

## 🐛 Troubleshooting

### "Unauthorized" error
- Zkontroluj, že jsi přihlášený
- Token je uložený v localStorage (F12 → Application → Local Storage)
- Vyloguj se a přihlas znovu

### "Request button" se nezobrazuje
- Ujisti se, že jsi přihlášený
- Non-admin users vidí "Request", admin vidí "Add to Library"

### Requests se nezobrazují
- Admin vidí všechny
- User vidí jen svoje
- Zkus refresh stránky

### První user není admin
- Smaž databázi: `rm backend/unifarr.db*`
- Restart backend
- Zaregistruj se znovu (první = admin)

---

## 🔮 Co zbývá dodělat (TODO)

### Auto-download po approve
Když admin klikne **Approve**, mělo by to ideálně:
1. ✅ Nastavit status na "approved"
2. ❌ Automaticky vyhledat na Webshare/trackerech
3. ❌ Stáhnout best match
4. ❌ Aktualizovat status na "downloading" → "downloaded"

**Jak to dodělat:**
- V `backend/src/routes/requests.ts` v `approve` handleru zavolat search + download service
- Nebo: udělat background worker, který periodicky kontroluje approved requests

### Notifikace
- Email/Discord webhook když je nový request
- Push notifikace uživateli když je request schválen/zamítnut

### Request history
- Zobrazit všechny requesty i po stažení
- Statistiky (kolik requestů per user)

---

## 📊 Database Schema

```sql
-- Users
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE,
  password TEXT,  -- bcrypt hash
  role TEXT DEFAULT 'user',  -- 'admin' | 'user'
  created_at DATETIME
);

-- Media Requests
CREATE TABLE media_requests (
  id INTEGER PRIMARY KEY,
  userId INTEGER,
  tmdbId INTEGER,
  type TEXT,  -- 'movie' | 'tv'
  title TEXT,
  year INTEGER,
  posterPath TEXT,
  status TEXT DEFAULT 'pending',  -- 'pending' | 'approved' | 'denied' | 'downloaded'
  userNote TEXT,
  adminNote TEXT,
  requestedAt DATETIME,
  processedAt DATETIME,
  processedBy INTEGER,  -- admin userId
  mediaItemId INTEGER,  -- když se stáhne
  FOREIGN KEY (userId) REFERENCES users(id)
);
```

---

## 🎯 Quick Start Checklist

- [ ] Backend běží na `:3002` (`npm run dev` v `backend/`)
- [ ] Frontend běží na `:3001` (`npm run dev` v `frontend/`)
- [ ] Zaregistroval jsi se jako první user → admin
- [ ] Otestoval jsi login/logout
- [ ] Vytvořil jsi druhý user account → běžný user
- [ ] User vytvořil request
- [ ] Admin schválil/zamítnul request
- [ ] Zkontroloval jsi, že user vidí jen svoje requesty
- [ ] Zkontroloval jsi, že admin vidí všechny requesty

---

**Hotovo! 🎉** Request system je ready. Teď můžeš pozvat rodinu/kámoše, zaregistrovat je, a oni můžou žádat o filmy/seriály!
