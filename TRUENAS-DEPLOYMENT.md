# TrueNAS Deployment Guide for Unifarr

This guide will help you deploy Unifarr on TrueNAS SCALE using Docker Compose.

## Prerequisites

- TrueNAS SCALE installed and running
- Docker and Docker Compose available (should be pre-installed on TrueNAS SCALE)
- Network access to pull Docker images from GitHub Container Registry

## Deployment Options

We provide two Docker Compose configurations for TrueNAS:

1. **docker-compose.truenas.yml** - Full configuration with healthchecks and networks
2. **docker-compose.truenas-minimal.yml** - Simplified configuration (recommended for most users)

## Step-by-Step Deployment

### Option 1: Using TrueNAS Custom App (Recommended)

1. **Navigate to Apps** in TrueNAS SCALE web interface

2. **Click "Discover Apps"** then **"Custom App"**

3. **Configure the application:**
   - **Application Name:** unifarr
   - **Version:** v2 (or your preferred version)

4. **Add Container Images:**

   **Container 1 - PostgreSQL Database:**
   - **Image Repository:** postgres
   - **Image Tag:** 16-alpine
   - **Container Name:** unifarr-postgres
   - **Environment Variables:**
     - POSTGRES_USER: unifarr
     - POSTGRES_PASSWORD: unifarr
     - POSTGRES_DB: unifarr
   - **Port Forwarding:**
     - Container Port: 5432
     - Node Port: 5432 (or your preferred port)
   - **Storage:**
     - Mount Path: /var/lib/postgresql/data
     - Dataset: Create new dataset for postgres data

   **Container 2 - Unifarr Application:**
   - **Image Repository:** ghcr.io/mrpajzl/unifarr
   - **Image Tag:** latest
   - **Container Name:** unifarr-app
   - **Environment Variables:**
     - DATABASE_URL: postgresql://unifarr:unifarr@unifarr-postgres:5432/unifarr
     - NODE_ENV: production
     - OPENSSL_LIB_DIR: /usr/lib
     - OPENSSL_CONF: /dev/null
   - **Port Forwarding:**
     - Container Port: 3000
     - Node Port: 3000 (or your preferred port)
   - **Command Override:**
     ```
     sh -c "npx prisma generate && npx prisma db push --accept-data-loss && node server.js"
     ```

5. **Create a Bridge Network:**
   - Network Name: unifarr-network
   - Attach both containers to this network

6. **Configure Dependencies:**
   - Set unifarr-app to depend on unifarr-postgres

### Option 2: Using Docker Compose via SSH

If you have SSH access to your TrueNAS system:

1. **SSH into your TrueNAS system**

2. **Create a directory for Unifarr:**
   ```bash
   mkdir -p /mnt/pool/apps/unifarr
   cd /mnt/pool/apps/unifarr
   ```

3. **Download the compose file:**
   ```bash
   curl -o docker-compose.yml https://raw.githubusercontent.com/mrpajzl/Unifarr/main/docker-compose.truenas-minimal.yml
   ```

4. **Start the application:**
   ```bash
   docker-compose up -d
   ```

5. **Check the logs:**
   ```bash
   docker-compose logs -f
   ```

## Troubleshooting

### Error: "Failed 'down' action for 'unifarr-v2' app"

This error typically occurs when:

1. **Invalid Docker Compose syntax** - Ensure you're using one of the TrueNAS-specific compose files
2. **Leftover containers** - Try cleaning up old containers:
   ```bash
   docker ps -a | grep unifarr
   docker rm -f unifarr-app unifarr-postgres
   docker volume prune
   ```
3. **Network conflicts** - Remove old networks:
   ```bash
   docker network rm unifarr-network
   ```

### Checking Application Logs

If the app fails to start, check the logs:

```bash
# Check TrueNAS app lifecycle logs
tail -f /var/log/app_lifecycle.log

# Check container logs
docker logs unifarr-app
docker logs unifarr-postgres
```

### Database Connection Issues

If the app can't connect to the database:

1. Ensure both containers are on the same network
2. Verify the DATABASE_URL environment variable is correct
3. Check PostgreSQL is healthy:
   ```bash
   docker exec unifarr-postgres pg_isready -U unifarr
   ```

### Prisma Generation Errors

If you see errors related to Prisma:

1. Ensure the OPENSSL_LIB_DIR and OPENSSL_CONF environment variables are set
2. Check that the Docker image is built for the correct architecture (x86_64/amd64)
3. Verify OpenSSL is available in the container:
   ```bash
   docker exec unifarr-app which openssl
   ```

## Accessing Unifarr

Once deployed successfully, access Unifarr at:

```
http://<truenas-ip>:3000
```

Replace `<truenas-ip>` with your TrueNAS server's IP address.

## Updating Unifarr

To update to the latest version:

1. **Using Custom App UI:**
   - Stop the application
   - Edit the app configuration
   - Change image tag to latest or specific version
   - Start the application

2. **Using Docker Compose:**
   ```bash
   cd /mnt/pool/apps/unifarr
   docker-compose pull
   docker-compose up -d
   ```

## Data Persistence

The PostgreSQL database data is stored in a Docker volume named `postgres_data`. This ensures your data persists across container restarts and updates.

To backup your data:

```bash
docker exec unifarr-postgres pg_dump -U unifarr unifarr > backup.sql
```

To restore from backup:

```bash
cat backup.sql | docker exec -i unifarr-postgres psql -U unifarr unifarr
```

## Support

For issues and questions:
- Check the logs: `/var/log/app_lifecycle.log`
- Review container logs: `docker logs unifarr-app`
- Open an issue on GitHub: https://github.com/mrpajzl/Unifarr/issues
