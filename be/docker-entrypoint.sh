#!/bin/sh
set -e

if [ -n "$DATABASE_URL" ]; then
  echo "⏳ Waiting for PostgreSQL..."
  attempts=0
  max="${DB_WAIT_ATTEMPTS:-30}"

  until node -e "
    const { Client } = require('pg');
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    client
      .connect()
      .then(() => client.end())
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  "; do
    attempts=$((attempts + 1))
    if [ "$attempts" -ge "$max" ]; then
      echo "❌ PostgreSQL not ready after ${max} attempts"
      exit 1
    fi
    sleep 2
  done

  echo "✅ PostgreSQL ready"
  npm run db:migrate
fi

exec "$@"
