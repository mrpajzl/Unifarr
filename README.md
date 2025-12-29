# Unifarr

A unified web application for managing Sonarr and Radarr instances from a single interface.

## Features

- **Unified Dashboard**: View status and information from both Sonarr and Radarr in one place
- **Full Configuration Access**: Access all configuration options from both services including:
  - Quality Profiles
  - Root Folders
  - Download Clients
  - Indexers
  - Notifications
  - Tags
  - Language Profiles (Sonarr only)
- **Series Management**: View and manage all your Sonarr series
- **Movie Management**: View and manage all your Radarr movies
- **Flexible Setup**: Enable one or both services independently
- **Secure**: API keys stored securely in database
- **Database-backed**: Configuration persisted in PostgreSQL database

## Getting Started

### Prerequisites

- Node.js 18+ and npm (for local development)
- Docker and Docker Compose (for Docker deployment)
- Sonarr and/or Radarr instances running and accessible
- API keys from your Sonarr/Radarr instances

### Installation

#### Using Docker (Recommended)

1. Clone or download this repository
2. Build and run with Docker Compose:
```bash
docker-compose up -d
```

3. The application will be available at [http://localhost:3000](http://localhost:3000)
4. The PostgreSQL database will be available at `localhost:5432`

The Docker setup includes:
- PostgreSQL database for configuration storage
- Automatic database schema initialization
- Persistent data volumes

#### Deploying on TrueNAS Scale

The easiest way to deploy Unifarr on TrueNAS Scale is using Docker Compose with the pre-built image from GitHub Container Registry (GHCR).

**⚠️ Important: If you get a "port already allocated" error, see the troubleshooting section below for solutions.**

**Quick Start (Copy & Paste):**

1. **SSH into your TrueNAS system** and create a directory for Unifarr:
   ```bash
   mkdir -p /mnt/pool/docker/unifarr
   cd /mnt/pool/docker/unifarr
   ```

2. **Create a `docker-compose.yml` file** with the following content:
   ```yaml
   services:
     postgres:
       image: postgres:16-alpine
       container_name: unifarr-postgres
       environment:
         POSTGRES_USER: unifarr
         POSTGRES_PASSWORD: unifarr
         POSTGRES_DB: unifarr
       ports:
         - "5432:5432"
       volumes:
         - postgres_data:/var/lib/postgresql/data
       healthcheck:
         test: ["CMD-SHELL", "pg_isready -U unifarr"]
         interval: 10s
         timeout: 5s
         retries: 5
       networks:
         - unifarr-network
       restart: unless-stopped

     app:
       image: ghcr.io/mrpajzl/unifarr:latest
       container_name: unifarr-app
       environment:
         DATABASE_URL: postgresql://unifarr:unifarr@postgres:5432/unifarr
         NODE_ENV: production
       ports:
         - "3000:3000"
       depends_on:
         - postgres
       networks:
         - unifarr-network
       restart: unless-stopped
       command: sh -c "npx prisma generate && npx prisma db push --accept-data-loss && node server.js"

   volumes:
     postgres_data:

   networks:
     unifarr-network:
       driver: bridge
   ```

3. **Find your GitHub Container Registry image name:**
   - Go to the GitHub repository page
   - Click on "Packages" (usually visible on the right sidebar or in the repository menu)
   - Or navigate to `https://github.com/mrpajzl/unifarr/pkgs/container/unifarr`
   - The image name will be in the format: `ghcr.io/mrpajzl/unifarr:latest`
   ```bash
   nano docker-compose.yml
   # Update the image line (e.g., change ghcr.io/mrpajzl/unifarr:latest to ghcr.io/ondrejzraly/unifarr:latest)
   ```

4. **Start the containers:**
   ```bash
   docker compose up -d
   ```

5. **Access the application:**
   - Open your browser and navigate to `http://<your-truenas-ip>:3000`
   - Make sure port 3000 is not blocked by your firewall

6. **Configure Unifarr:**
   - On first launch, you'll be redirected to the configuration page
   - Enter your Sonarr URL (e.g., `http://192.168.1.100:8989`) and API key
   - Enter your Radarr URL (e.g., `http://192.168.1.100:7878`) and API key
   - Test connections and save your configuration

**Updating the Application:**

To update to the latest version, simply pull the new image and restart:
```bash
cd /mnt/pool/docker/unifarr
docker compose pull
docker compose up -d
```

**Important Notes:**

- **Image Location**: The Docker image is hosted on GitHub Container Registry (GHCR). Find the exact image name by visiting the repository's Packages page. The format is `ghcr.io/mrpajzl/unifarr:latest`. 
- **Network Access**: Ensure Unifarr can reach your Sonarr/Radarr instances. Use their internal IP addresses if on the same network, or full URLs for external services
- **Storage**: PostgreSQL data is stored in a Docker volume (`postgres_data`) and persists across container restarts
- **Backups**: To backup your configuration, you can export the PostgreSQL volume or use `docker exec` to create a database dump
- **Firewall**: Ensure port 3000 is open in your TrueNAS firewall settings if accessing from other devices on your network

**Troubleshooting:**

If you encounter errors when deploying through TrueNAS Scale Apps UI:

1. **Check the logs first:**
   ```bash
   # TrueNAS Apps log
   cat /var/log/app_lifecycle.log
   
   # Container logs (if containers started)
   docker logs unifarr-app
   docker logs unifarr-postgres
   
   # Check if containers are running
   docker ps -a | grep unifarr
   ```

2. **Verify the image exists and is accessible:**
   - Make sure the GitHub Container Registry image is public or you have proper authentication configured
   - Try pulling the image manually: `docker pull ghcr.io/YOUR_USERNAME/unifarr:latest`
   - Check if the image is accessible: `docker images | grep unifarr`

3. **Common issues and fixes:**
   
   - **Port already allocated**: If you see `Bind for 0.0.0.0:3000 failed: port is already allocated`, port 3000 is in use. 
     
     **Option A: Clean up existing containers (Recommended)**
     ```bash
     # SSH into TrueNAS and run these commands:
     
     # Find all unifarr containers (including stopped ones)
     docker ps -a | grep unifarr
     
     # Stop all unifarr containers
     docker stop $(docker ps -aq --filter "name=unifarr") 2>/dev/null || true
     
     # Remove all unifarr containers
     docker rm $(docker ps -aq --filter "name=unifarr") 2>/dev/null || true
     
     # Find what else might be using port 3000
     docker ps --format "table {{.ID}}\t{{.Names}}\t{{.Ports}}" | grep 3000
     
     # If you find another container, stop it:
     # docker stop <container-id-or-name>
     # docker rm <container-id-or-name>
     ```
     
     **Option B: Use a different port (Quick fix)**
     - Use the `docker-compose.truenas-port3001.yml` file which uses port 3001
     - Or manually change the port mapping in your docker-compose.yml:
       ```yaml
       ports:
         - "3001:3000"  # Use port 3001 on host, 3000 in container
       ```
     - Then access the app at `http://<your-truenas-ip>:3001`
   
   - **Version attribute obsolete**: TrueNAS Scale's newer Docker Compose doesn't need the `version` line. Remove it if you see a warning.
   
   - **Image pull errors**: If the image is private, you may need to authenticate with GHCR first:
     ```bash
     echo $GITHUB_TOKEN | docker login ghcr.io -u YOUR_USERNAME --password-stdin
     ```
   
   - **Architecture mismatch**: The image supports both `linux/amd64` and `linux/arm64`. For Intel 64-bit, use `linux/amd64` which should be automatically selected.
   
   - **Prisma OpenSSL error**: If you see an error like `Prisma Client could not locate the Query Engine for runtime "linux-musl-arm64-openssl-1.1.x"`, this means the image was built with an older Prisma schema. The schema has been updated to support both OpenSSL 3.0.x and 1.1.x. You'll need to pull the latest image (after it's been rebuilt) or rebuild locally:
     ```bash
     docker compose pull
     docker compose up -d
     ```
   
   - **Healthcheck/depends_on issues**: If TrueNAS Scale doesn't support `condition: service_healthy`, try this simplified version:
     ```yaml
     depends_on:
       - postgres
     ```
     And increase the sleep time in the command:
     ```yaml
     command: sh -c "sleep 15 && npx prisma generate && npx prisma db push --accept-data-loss && node server.js"
     ```
   
   - **Container name conflicts**: If you get "container name already in use" errors, remove old containers first:
     ```bash
     docker rm -f unifarr-app unifarr-postgres
     docker compose up -d
     ```
   
   - **Network issues**: If containers can't communicate, try removing the custom network and use the default:
     ```yaml
     # Remove the networks section and network references
     # Containers will use the default bridge network
     ```

4. **Alternative: Minimal docker-compose (if above doesn't work):**
   Create a simplified version without healthchecks:
   ```yaml
   services:
     postgres:
       image: postgres:16-alpine
       environment:
         POSTGRES_USER: unifarr
         POSTGRES_PASSWORD: unifarr
         POSTGRES_DB: unifarr
       volumes:
         - postgres_data:/var/lib/postgresql/data
       restart: unless-stopped
   
     app:
       image: ghcr.io/YOUR_USERNAME/unifarr:latest
       environment:
         DATABASE_URL: postgresql://unifarr:unifarr@postgres:5432/unifarr
         NODE_ENV: production
       ports:
         - "3000:3000"
       depends_on:
         - postgres
       restart: unless-stopped
       command: sh -c "sleep 15 && npx prisma generate && npx prisma db push --accept-data-loss && node server.js"
   
   volumes:
     postgres_data:
   ```

5. **Deploy via SSH instead:**
   If the Apps UI continues to have issues, you can deploy directly via SSH (this often works better):
   ```bash
   cd /mnt/pool/docker/unifarr
   docker compose down  # Remove any existing containers
   docker compose up -d
   ```

#### Local Development

**Quick Setup (Recommended):**

1. Clone or download this repository
2. Install dependencies:
```bash
npm install
```

3. Run the setup script (this will start PostgreSQL, create .env, and initialize the database):
```bash
npm run setup
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

**Manual Setup:**

If you prefer to set up manually:

1. Start PostgreSQL database:
```bash
npm run db:start
# or
docker-compose up -d postgres
```

2. Create a `.env` file with your database URL:
```bash
echo "DATABASE_URL=postgresql://unifarr:unifarr@localhost:5432/unifarr" > .env
```

3. Generate Prisma Client and push database schema:
```bash
npm run db:generate
npm run db:push
```

4. Run the development server:
```bash
npm run dev
```

**Note:** Make sure PostgreSQL is running before starting the dev server, otherwise you'll get database connection errors when trying to save configuration.

### Configuration

On first launch, you'll be redirected to the configuration page where you can:

1. Enter your Sonarr URL (e.g., `http://localhost:8989`) and API key
2. Enter your Radarr URL (e.g., `http://localhost:7878`) and API key
3. Enable/disable each service independently
4. Test connections before saving

Your configuration is stored in the database and persists across sessions and browser restarts.

## Usage

### Dashboard
View the status of both services, including version information and connection status.

### Sonarr
- View all series in your library
- Access all Sonarr settings and configuration options
- Manage quality profiles, root folders, download clients, indexers, and more

### Radarr
- View all movies in your library
- Access all Radarr settings and configuration options
- Manage quality profiles, root folders, download clients, indexers, and more

### Settings
Reconfigure your API keys and service URLs at any time.

## API Integration

This application uses the official Sonarr and Radarr REST APIs (v3). All configuration options available through the APIs are accessible through the settings pages.

## Development

Built with:
- Next.js 14
- React 18
- TypeScript
- Tailwind CSS

## License

MIT

