--
-- PostgreSQL database dump
--

-- Dumped from database version 12.4
-- Dumped by pg_dump version 12.4

-- Started on 2021-03-08 07:37:21 UTC

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 202 (class 1259 OID 24576)
-- Name: Games; Type: TABLE; Schema: public; Owner: train
--

CREATE TABLE public."Games" (
    id character varying(255) NOT NULL,
    "gameName" character varying(255),
    players json,
    "setupData" json,
    gameover json,
    "nextRoomID" character varying(255),
    unlisted boolean,
    state json,
    "initialState" json,
    log json,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


ALTER TABLE public."Games" OWNER TO train;

--
-- TOC entry 206 (class 1259 OID 24608)
-- Name: credstore; Type: TABLE; Schema: public; Owner: train
--

CREATE TABLE public.credstore (
    credential character(21) NOT NULL,
    "userId" integer NOT NULL,
    created date NOT NULL
);


ALTER TABLE public.credstore OWNER TO train;

--
-- TOC entry 207 (class 1259 OID 24618)
-- Name: game_metadata; Type: TABLE; Schema: public; Owner: train
--

CREATE TABLE public.game_metadata (
    "gameId" character varying NOT NULL,
    description character varying
);


ALTER TABLE public.game_metadata OWNER TO train;

--
-- TOC entry 205 (class 1259 OID 24600)
-- Name: session; Type: TABLE; Schema: public; Owner: train
--

CREATE TABLE public.session (
    key character(40) NOT NULL,
    data json NOT NULL,
    expires timestamp with time zone NOT NULL
);


ALTER TABLE public.session OWNER TO train;

--
-- TOC entry 204 (class 1259 OID 24591)
-- Name: users; Type: TABLE; Schema: public; Owner: train
--

CREATE TABLE public.users (
    user_id integer NOT NULL,
    username text NOT NULL,
    pass_hash text NOT NULL,
    role text
);


ALTER TABLE public.users OWNER TO train;

--
-- TOC entry 203 (class 1259 OID 24589)
-- Name: users_user_id_seq; Type: SEQUENCE; Schema: public; Owner: train
--

CREATE SEQUENCE public.users_user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.users_user_id_seq OWNER TO train;

--
-- TOC entry 2988 (class 0 OID 0)
-- Dependencies: 203
-- Name: users_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: train
--

ALTER SEQUENCE public.users_user_id_seq OWNED BY public.users.user_id;


--
-- TOC entry 2844 (class 2604 OID 24594)
-- Name: users user_id; Type: DEFAULT; Schema: public; Owner: train
--

ALTER TABLE ONLY public.users ALTER COLUMN user_id SET DEFAULT nextval('public.users_user_id_seq'::regclass);


--
-- TOC entry 2846 (class 2606 OID 24583)
-- Name: Games Games_pkey; Type: CONSTRAINT; Schema: public; Owner: train
--

ALTER TABLE ONLY public."Games"
    ADD CONSTRAINT "Games_pkey" PRIMARY KEY (id);


--
-- TOC entry 2852 (class 2606 OID 24612)
-- Name: credstore credstore_pkey; Type: CONSTRAINT; Schema: public; Owner: train
--

ALTER TABLE ONLY public.credstore
    ADD CONSTRAINT credstore_pkey PRIMARY KEY (credential);


--
-- TOC entry 2854 (class 2606 OID 24625)
-- Name: game_metadata game_metadata_pkey; Type: CONSTRAINT; Schema: public; Owner: train
--

ALTER TABLE ONLY public.game_metadata
    ADD CONSTRAINT game_metadata_pkey PRIMARY KEY ("gameId");


--
-- TOC entry 2850 (class 2606 OID 24607)
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: train
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (key);


--
-- TOC entry 2848 (class 2606 OID 24599)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: train
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- TOC entry 2855 (class 2606 OID 24613)
-- Name: credstore fk_credstore_users; Type: FK CONSTRAINT; Schema: public; Owner: train
--

ALTER TABLE ONLY public.credstore
    ADD CONSTRAINT fk_credstore_users FOREIGN KEY ("userId") REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- TOC entry 2856 (class 2606 OID 24626)
-- Name: game_metadata fk_games_gamemetadata; Type: FK CONSTRAINT; Schema: public; Owner: train
--

ALTER TABLE ONLY public.game_metadata
    ADD CONSTRAINT fk_games_gamemetadata FOREIGN KEY ("gameId") REFERENCES public."Games"(id) ON DELETE CASCADE;


-- Completed on 2021-03-08 07:37:21 UTC

--
-- PostgreSQL database dump complete
--

