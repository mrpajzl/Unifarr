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

