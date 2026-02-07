#!/bin/bash
set -e

echo "Deploying backend to 10.0.0.18..."

# Copy source files
scp -r backend/src/* hassio@10.0.0.18:/root/unifarr/backend/src/

# Restart backend
ssh hassio@10.0.0.18 "cd /root/unifarr/backend && pm2 restart unifarr-backend"

echo "Deployed! Showing logs..."
ssh hassio@10.0.0.18 "pm2 logs unifarr-backend --lines 30 --nostream"
