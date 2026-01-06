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
