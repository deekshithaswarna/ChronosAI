#!/usr/bin/env bash
# Start the local Chronos stack: sudo-free MySQL + dev server.
# Usage: ./dev-local.sh
set -euo pipefail

MYSQL_BASE="$HOME/.local/chronos-mysql"
MYSQL_DATA="$HOME/.local/chronos-mysql-data"
MYSQL_SOCK="$MYSQL_BASE/mysql.sock"
MYSQL_LOG="$MYSQL_BASE/mysqld.log"

# 1. Start MySQL if it isn't already answering on 3306.
if "$MYSQL_BASE/bin/mysqladmin" --no-defaults -h 127.0.0.1 -P 3306 -u root ping >/dev/null 2>&1; then
  echo "[mysql] already running on 127.0.0.1:3306"
else
  echo "[mysql] starting..."
  nohup "$MYSQL_BASE/bin/mysqld" --no-defaults \
    --basedir="$MYSQL_BASE" --datadir="$MYSQL_DATA" \
    --socket="$MYSQL_SOCK" --port=3306 --bind-address=127.0.0.1 \
    --pid-file="$MYSQL_BASE/mysqld.pid" >"$MYSQL_LOG" 2>&1 &
  for i in $(seq 1 30); do
    if "$MYSQL_BASE/bin/mysqladmin" --no-defaults -h 127.0.0.1 -P 3306 -u root ping >/dev/null 2>&1; then
      echo "[mysql] ready"; break
    fi
    sleep 1
  done
fi

# 2. Start the dev server (reads .env). Corepack runs the pinned pnpm.
echo "[app] starting dev server on http://localhost:3000"
echo "[app] first time? open http://localhost:3000/api/dev/login to sign in."
exec corepack pnpm dev
