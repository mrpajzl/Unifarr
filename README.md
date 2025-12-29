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

**Quick Start (Copy & Paste):**

1. **SSH into your TrueNAS system** and create a directory for Unifarr:
   ```bash
   mkdir -p /mnt/pool/docker/unifarr
   cd /mnt/pool/docker/unifarr
   ```

2. **Create a `docker-compose.yml` file** with the following content:
   ```yaml
   version: '3.8'

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
         postgres:
           condition: service_healthy
       networks:
         - unifarr-network
       restart: unless-stopped

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

