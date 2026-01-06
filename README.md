# Kaizen - Goal Getter

A full-stack application for tracking personal goals, measures, and managing a reward economy.

## Tech Stack
- **Frontend**: React, Vite, Tailwind CSS, Lucide React
- **Backend**: Node.js, Express, Prisma, PostgreSQL
- **Database**: PostgreSQL

## Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js (for local development outside Docker)

### Running with Docker

1. Clone functionality
   ```bash
   git clone https://github.com/adamwarniment/kaizen.git
   cd kaizen
   ```

2. Start the application
   ```bash
   docker-compose up --build
   ```

3. Access the application
   - Frontend: `http://localhost:5173`
   - Backend API: `http://localhost:3001`

## Features
- **Measures & Goals**: Define what you want to track (e.g., "Gym Visits", "Water Intake").
- **Log Entries**: Log your daily or weekly progress.
- **Reward System**: Earn calculated rewards based on hitting your targets.
- **Transactions**: Manage your "Kaizen Balance" with manual credits/debits and cashouts.
- **Dashboard**: Visual overview of active measures and stats.

## License
[MIT](LICENSE)

## Deployment

### Production Setup (Ubuntu/Linux)

This project is configured to use Docker Compose for production deployment, pulling images from GitHub Container Registry (GHCR).

1. **Authentication**
   Create a Personal Access Token (PAT) on GitHub with `read:packages` scope.
   On your Ubuntu machine, log in to the registry:
   ```bash
   echo $CR_PAT | docker login ghcr.io -u USERNAME --password-stdin
   ```

2. **Configuration**
   Copy `.env.example` to `.env` and configure your preferences:
   ```bash
   cp .env.example .env
   nano .env
   ```
   Update `GITHUB_REPOSITORY_OWNER` and `GITHUB_REPOSITORY_NAME` to match your repo.
   Set your desired `WEB_PORT` and `API_PORT` if the defaults clash with other services.

3. **Deploy**
   Run the production compose file:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

   To pull the latest images and restart:
   ```bash
   docker-compose -f docker-compose.prod.yml pull
   docker-compose -f docker-compose.prod.yml up -d
   ```
