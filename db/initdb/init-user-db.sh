#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE TABLE public.users
    (
        user_id integer NOT NULL DEFAULT nextval('users_user_id_seq'::regclass),
        username text COLLATE pg_catalog."default",
        pass_hash text COLLATE pg_catalog."default",
        role text COLLATE pg_catalog."default",
        CONSTRAINT pk PRIMARY KEY (user_id)
    )

    TABLESPACE pg_default;

    ALTER TABLE public.users
        OWNER to train;

    CREATE TABLE public.session
    (
        key character(40) COLLATE pg_catalog."default" NOT NULL,
        data json NOT NULL,
        expires timestamp with time zone NOT NULL,
        CONSTRAINT session_pkey PRIMARY KEY (key)
    );

    CREATE TABLE public.credstore
    (
        credential character(21) COLLATE pg_catalog."default" NOT NULL,
        "userId" integer NOT NULL,
        created date NOT NULL,
        CONSTRAINT credstore_pkey PRIMARY KEY (credential),
        CONSTRAINT fk_credstore_users FOREIGN KEY ("userId")
            REFERENCES public.users (user_id) MATCH SIMPLE
            ON UPDATE NO ACTION
            ON DELETE CASCADE
            NOT VALID
    );

    CREATE TABLE public.game_metadata
    (
        "gameId" character varying COLLATE pg_catalog."default" NOT NULL,
        description character varying COLLATE pg_catalog."default",
        CONSTRAINT game_metadata_pkey PRIMARY KEY ("gameId"),
        CONSTRAINT fk_games_gamemetadata FOREIGN KEY ("gameId")
            REFERENCES public."Games" (id) MATCH SIMPLE
            ON UPDATE NO ACTION
            ON DELETE CASCADE
    )

    TABLESPACE pg_default;

    ALTER TABLE public.game_metadata
        OWNER to train;

EOSQL