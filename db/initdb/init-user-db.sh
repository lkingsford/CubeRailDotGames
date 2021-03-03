#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE TABLE users (
        user_id SERIAL,
        username TEXT,
        pass_hash TEXT,
        role TEXT,
    );

    CREATE TABLE public.session
    (
        key character(40) COLLATE pg_catalog."default" NOT NULL,
        data json NOT NULL,
        expires timestamp with time zone NOT NULL,
        CONSTRAINT session_pkey PRIMARY KEY (key)
    )


EOSQL