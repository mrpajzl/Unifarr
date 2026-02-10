#!/bin/bash
set -e

echo "🚀 Deploying Unifarr to TrueNAS Production..."

TRUENAS_HOST="10.0.0.141"
TRUENAS_USER="truenas_admin"
DEPLOY_PATH="/mnt/storage/apps/unifarr"

echo "📤 Uploading docker-compose configuration..."
scp docker-compose.prod.yml ${TRUENAS_USER}@${TRUENAS_HOST}:${DEPLOY_PATH}/docker-compose.yml

echo "🔄 Pulling latest images and restarting..."
ssh ${TRUENAS_USER}@${TRUENAS_HOST} bash <<EOF
set -e
cd ${DEPLOY_PATH}

# Pull latest images
echo "📥 Pulling latest Docker images..."
docker compose pull

# Restart services
echo "🔄 Restarting services..."
docker compose up -d --force-recreate

echo ""
echo "✅ Deployment complete!"
docker compose ps
EOF

echo ""
echo "✅ Production deployment successful!"
echo ""
echo "🌐 Frontend: http://10.0.0.141:3000"
echo "🔧 Backend:  http://10.0.0.141:3002"
echo ""
echo "📊 Check logs: ssh ${TRUENAS_USER}@${TRUENAS_HOST} 'cd ${DEPLOY_PATH} && docker compose logs -f'"
