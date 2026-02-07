# Add Unifarr Catalog to TrueNAS (3 clicks)

## On your phone/computer:

1. Open: **http://10.0.0.141** (your TrueNAS)
2. Go to: **Apps** (sidebar)
3. Click: **Discover Apps** (top button)
4. In **Discover** page, look for **three dots (⋮)** or settings icon
5. Click: **Manage Catalogs** or **Catalogs**
6. Click: **Add** or **Add Catalog**
7. Fill in:
   ```
   Name: unifarr
   Repository: https://github.com/mrpajzl/Unifarr
   Branch: gh-pages
   Trains: charts
   ```
8. **Save**
9. Wait 30-60 seconds for sync
10. Refresh **Available Applications**
11. **Unifarr** should appear! Click **Install**

---

## If you can't find "Manage Catalogs":

### Try these paths (UI changed in Electric Eel):
1. **Apps → Configuration → Settings** (bottom of dropdown)
2. **Apps → Three dots (⋮) → Manage Catalogs**
3. **Apps → Settings icon (gear)**

---

## Alternative: Docker Compose (already running!)

Unifarr is already deployed via Docker Compose:
- **Frontend:** http://10.0.0.141:3001
- **Backend:** http://10.0.0.141:3002
- **Location:** `/mnt/storage/apps/unifarr`

**To update:**
```bash
ssh truenas_admin@10.0.0.141
cd /mnt/storage/apps/unifarr
sudo docker compose pull
sudo docker compose up -d
```

---

**Catalog URL for reference:**
```
https://mrpajzl.github.io/Unifarr/index.yaml
```
