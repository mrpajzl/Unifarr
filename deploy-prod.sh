#!/bin/bash
set -e

echo "🚀 Deploying Unifarr to TrueNAS Production..."

TRUENAS_HOST="10.0.0.141"
TRUENAS_USER="truenas_admin"
TRUENAS_PASSWORD="Cx3250ftrm"
DEPLOY_PATH="/mnt/storage/apps/unifarr"

echo "📤 Uploading docker-compose configuration..."
scp docker-compose.prod.yml ${TRUENAS_USER}@${TRUENAS_HOST}:/tmp/docker-compose.yml

echo "🔄 Deploying on TrueNAS..."
sshpass -p "${TRUENAS_PASSWORD}" ssh ${TRUENAS_USER}@${TRUENAS_HOST} bash <<EOF
set -e

echo "${TRUENAS_PASSWORD}" | sudo -S bash << 'INNEREOF'
set -e
cd ${DEPLOY_PATH}

# Copy new docker-compose
cp /tmp/docker-compose.yml docker-compose.yml
rm /tmp/docker-compose.yml

# Pull latest images
echo "📥 Pulling latest Docker images..."
docker compose pull

# Restart services
echo "🔄 Restarting services..."
docker compose up -d --force-recreate

echo ""
echo "✅ Deployment complete!"
docker compose ps
INNEREOF
EOF

echo ""
echo "✅ Production deployment successful!"
echo ""
echo "🌐 Frontend: http://10.0.0.141:3000"
echo "🔧 Backend:  http://10.0.0.141:3002"
