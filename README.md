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
- **Secure**: API keys stored locally in browser storage

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Sonarr and/or Radarr instances running and accessible
- API keys from your Sonarr/Radarr instances

### Installation

1. Clone or download this repository
2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Configuration

On first launch, you'll be redirected to the configuration page where you can:

1. Enter your Sonarr URL (e.g., `http://localhost:8989`) and API key
2. Enter your Radarr URL (e.g., `http://localhost:7878`) and API key
3. Enable/disable each service independently
4. Test connections before saving

Your configuration is stored locally in your browser and persists across sessions.

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

