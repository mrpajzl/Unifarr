# Deploy Backend Fix

Run these commands to deploy the TMDB fix:

```bash
cd /Users/ondrejzraly/clawd/unifarr

# Copy files to server (enter password: Cx3250ftrm when prompted)
scp backend/src/services/tmdb.ts hassio@10.0.0.18:/root/unifarr/backend/src/services/
scp backend/src/routes/search.ts hassio@10.0.0.18:/root/unifarr/backend/src/routes/

# Restart backend
ssh hassio@10.0.0.18 "pm2 restart unifarr-backend"

# Watch logs to see the detailed error
ssh hassio@10.0.0.18 "pm2 logs unifarr-backend --lines 50"
```

Then try searching for "avatar" again - the logs will now show the exact error.
