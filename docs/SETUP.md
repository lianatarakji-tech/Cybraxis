# Cybraxis Setup Guide

## Prerequisites

Install:

- Node.js and npm
- PostgreSQL
- pgAdmin 4 or another PostgreSQL administration tool
- Git
- A modern web browser

## Clone the Repository

```bash
git clone <PUBLIC_REPOSITORY_URL>
cd cybraxis
```

## Install Frontend Dependencies

```bash
npm install
```

## Configure PostgreSQL

Create a database named:

```text
cybraxis
```

Run:

```text
server/db/schema.sql
```

## Configure the Backend Environment

Copy `server/.env.example` to `server/.env`.

Example:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cybraxis
DB_USER=postgres
DB_PASSWORD=your_password_here
NODE_ENV=development
AI_ENABLED=false
AI_PROVIDER=mock
MISTRAL_API_KEY=
MISTRAL_MODEL=ministral-8b-latest
AI_TIMEOUT_HINT_MS=3000
AI_MAX_OUTPUT_TOKENS_HINT=160
```

Do not commit `server/.env`.

For Mistral-backed hints:

```env
AI_ENABLED=true
AI_PROVIDER=mistral
MISTRAL_API_KEY=your_real_key_here
```

## Install and Start the Backend

```bash
cd server
npm install
npm start
```

The default backend port is `5000`.

## Start the Frontend

From the repository root:

```bash
npm start
```

The React app normally opens at `http://localhost:3000`.

## Production Build

```bash
npm run build
```

## Security Notes

- Never publish `server/.env`
- Never commit real API keys
- Never commit production database credentials
- Use a dedicated development database
- Replace the local learner-account mechanism before any production deployment
