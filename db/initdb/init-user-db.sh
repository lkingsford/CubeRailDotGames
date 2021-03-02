#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE TABLE users (
        user_id SERIAL,
        user_name TEXT,
        pass_hash TEXT,
        role TEXT,
    );
EOSQL