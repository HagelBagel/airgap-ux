\restrict dbmate

-- Dumped from database version 17.11 (Debian 17.11-1.pgdg13+2)
-- Dumped by pg_dump version 17.11

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: citext; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA public;


--
-- Name: EXTENSION citext; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION citext IS 'data type for case-insensitive character strings';


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at := now();
  return new;
end;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: excerpt_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.excerpt_tags (
    excerpt_id uuid NOT NULL,
    tag_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: excerpts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.excerpts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    segment_id uuid NOT NULL,
    start_offset integer NOT NULL,
    end_offset integer NOT NULL,
    CONSTRAINT excerpts_check CHECK (((start_offset >= 0) AND (end_offset > start_offset)))
);


--
-- Name: insight_excerpts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.insight_excerpts (
    insight_id uuid NOT NULL,
    excerpt_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: insights; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.insights (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    project_id uuid NOT NULL,
    title text NOT NULL,
    body text NOT NULL
);


--
-- Name: job_cards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job_cards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    project_id uuid NOT NULL,
    description text NOT NULL,
    origin text NOT NULL,
    override_importance smallint,
    override_satisfaction smallint,
    CONSTRAINT job_cards_origin_check CHECK ((origin = ANY (ARRAY['ai'::text, 'manual'::text]))),
    CONSTRAINT job_cards_override_importance_check CHECK (((override_importance >= 1) AND (override_importance <= 10))),
    CONSTRAINT job_cards_override_satisfaction_check CHECK (((override_satisfaction >= 1) AND (override_satisfaction <= 10)))
);


--
-- Name: outcome_ratings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.outcome_ratings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    job_card_id uuid NOT NULL,
    participant_id uuid NOT NULL,
    importance smallint NOT NULL,
    satisfaction smallint NOT NULL,
    CONSTRAINT outcome_ratings_importance_check CHECK (((importance >= 1) AND (importance <= 10))),
    CONSTRAINT outcome_ratings_satisfaction_check CHECK (((satisfaction >= 1) AND (satisfaction <= 10)))
);


--
-- Name: participants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.participants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    project_id uuid NOT NULL,
    label public.citext NOT NULL,
    display_name text,
    role text NOT NULL,
    CONSTRAINT participants_role_check CHECK ((role = ANY (ARRAY['participant'::text, 'interviewer'::text])))
);


--
-- Name: projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    owner_id uuid NOT NULL,
    name text NOT NULL
);


--
-- Name: rating_excerpts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rating_excerpts (
    rating_id uuid NOT NULL,
    excerpt_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    version character varying NOT NULL
);


--
-- Name: segments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.segments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    transcript_id uuid NOT NULL,
    ordinal integer NOT NULL,
    participant_id uuid,
    speaker_label text,
    text text NOT NULL,
    start_char integer NOT NULL,
    end_char integer NOT NULL,
    start_time interval,
    end_time interval,
    CONSTRAINT segments_check CHECK (((start_char >= 0) AND (end_char > start_char))),
    CONSTRAINT segments_check1 CHECK (((start_time >= '00:00:00'::interval) AND (end_time >= start_time))),
    CONSTRAINT segments_check2 CHECK (((start_time IS NULL) = (end_time IS NULL))),
    CONSTRAINT segments_speaker_label_check CHECK ((speaker_label <> ''::text))
);


--
-- Name: tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    project_id uuid NOT NULL,
    name public.citext NOT NULL,
    description text
);


--
-- Name: transcripts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transcripts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    project_id uuid NOT NULL,
    title text NOT NULL,
    original_filename text,
    raw_text text NOT NULL,
    content_hash text NOT NULL,
    source text NOT NULL,
    replaces_transcript_id uuid,
    interviewed_on date,
    CONSTRAINT transcripts_check CHECK ((replaces_transcript_id <> id)),
    CONSTRAINT transcripts_source_check CHECK ((source = 'upload'::text))
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    display_name text,
    email public.citext NOT NULL
);


--
-- Name: excerpt_tags excerpt_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.excerpt_tags
    ADD CONSTRAINT excerpt_tags_pkey PRIMARY KEY (excerpt_id, tag_id);


--
-- Name: excerpts excerpts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.excerpts
    ADD CONSTRAINT excerpts_pkey PRIMARY KEY (id);


--
-- Name: excerpts excerpts_segment_id_start_offset_end_offset_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.excerpts
    ADD CONSTRAINT excerpts_segment_id_start_offset_end_offset_key UNIQUE (segment_id, start_offset, end_offset);


--
-- Name: insight_excerpts insight_excerpts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insight_excerpts
    ADD CONSTRAINT insight_excerpts_pkey PRIMARY KEY (insight_id, excerpt_id);


--
-- Name: insights insights_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insights
    ADD CONSTRAINT insights_pkey PRIMARY KEY (id);


--
-- Name: job_cards job_cards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_cards
    ADD CONSTRAINT job_cards_pkey PRIMARY KEY (id);


--
-- Name: outcome_ratings outcome_ratings_job_card_id_participant_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outcome_ratings
    ADD CONSTRAINT outcome_ratings_job_card_id_participant_id_key UNIQUE (job_card_id, participant_id);


--
-- Name: outcome_ratings outcome_ratings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outcome_ratings
    ADD CONSTRAINT outcome_ratings_pkey PRIMARY KEY (id);


--
-- Name: participants participants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.participants
    ADD CONSTRAINT participants_pkey PRIMARY KEY (id);


--
-- Name: participants participants_project_id_label_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.participants
    ADD CONSTRAINT participants_project_id_label_key UNIQUE (project_id, label);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: rating_excerpts rating_excerpts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rating_excerpts
    ADD CONSTRAINT rating_excerpts_pkey PRIMARY KEY (rating_id, excerpt_id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: segments segments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.segments
    ADD CONSTRAINT segments_pkey PRIMARY KEY (id);


--
-- Name: segments segments_transcript_id_ordinal_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.segments
    ADD CONSTRAINT segments_transcript_id_ordinal_key UNIQUE (transcript_id, ordinal);


--
-- Name: tags tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_pkey PRIMARY KEY (id);


--
-- Name: tags tags_project_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_project_id_name_key UNIQUE (project_id, name);


--
-- Name: transcripts transcripts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transcripts
    ADD CONSTRAINT transcripts_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: excerpt_tags_tag_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX excerpt_tags_tag_id_idx ON public.excerpt_tags USING btree (tag_id);


--
-- Name: insight_excerpts_excerpt_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX insight_excerpts_excerpt_id_idx ON public.insight_excerpts USING btree (excerpt_id);


--
-- Name: insights_project_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX insights_project_id_idx ON public.insights USING btree (project_id);


--
-- Name: job_cards_project_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX job_cards_project_id_idx ON public.job_cards USING btree (project_id);


--
-- Name: outcome_ratings_participant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX outcome_ratings_participant_id_idx ON public.outcome_ratings USING btree (participant_id);


--
-- Name: projects_owner_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX projects_owner_id_idx ON public.projects USING btree (owner_id);


--
-- Name: rating_excerpts_excerpt_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX rating_excerpts_excerpt_id_idx ON public.rating_excerpts USING btree (excerpt_id);


--
-- Name: segments_participant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX segments_participant_id_idx ON public.segments USING btree (participant_id);


--
-- Name: transcripts_project_id_content_hash_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX transcripts_project_id_content_hash_idx ON public.transcripts USING btree (project_id, content_hash);


--
-- Name: excerpts excerpts_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER excerpts_set_updated_at BEFORE UPDATE ON public.excerpts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: insights insights_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER insights_set_updated_at BEFORE UPDATE ON public.insights FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: job_cards job_cards_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER job_cards_set_updated_at BEFORE UPDATE ON public.job_cards FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: outcome_ratings outcome_ratings_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER outcome_ratings_set_updated_at BEFORE UPDATE ON public.outcome_ratings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: participants participants_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER participants_set_updated_at BEFORE UPDATE ON public.participants FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: projects projects_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER projects_set_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: segments segments_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER segments_set_updated_at BEFORE UPDATE ON public.segments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: tags tags_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tags_set_updated_at BEFORE UPDATE ON public.tags FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: transcripts transcripts_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER transcripts_set_updated_at BEFORE UPDATE ON public.transcripts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: users users_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: excerpt_tags excerpt_tags_excerpt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.excerpt_tags
    ADD CONSTRAINT excerpt_tags_excerpt_id_fkey FOREIGN KEY (excerpt_id) REFERENCES public.excerpts(id) ON DELETE CASCADE;


--
-- Name: excerpt_tags excerpt_tags_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.excerpt_tags
    ADD CONSTRAINT excerpt_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- Name: excerpts excerpts_segment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.excerpts
    ADD CONSTRAINT excerpts_segment_id_fkey FOREIGN KEY (segment_id) REFERENCES public.segments(id) ON DELETE CASCADE;


--
-- Name: insight_excerpts insight_excerpts_excerpt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insight_excerpts
    ADD CONSTRAINT insight_excerpts_excerpt_id_fkey FOREIGN KEY (excerpt_id) REFERENCES public.excerpts(id) ON DELETE CASCADE;


--
-- Name: insight_excerpts insight_excerpts_insight_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insight_excerpts
    ADD CONSTRAINT insight_excerpts_insight_id_fkey FOREIGN KEY (insight_id) REFERENCES public.insights(id) ON DELETE CASCADE;


--
-- Name: insights insights_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insights
    ADD CONSTRAINT insights_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: job_cards job_cards_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_cards
    ADD CONSTRAINT job_cards_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: outcome_ratings outcome_ratings_job_card_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outcome_ratings
    ADD CONSTRAINT outcome_ratings_job_card_id_fkey FOREIGN KEY (job_card_id) REFERENCES public.job_cards(id) ON DELETE CASCADE;


--
-- Name: outcome_ratings outcome_ratings_participant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outcome_ratings
    ADD CONSTRAINT outcome_ratings_participant_id_fkey FOREIGN KEY (participant_id) REFERENCES public.participants(id) ON DELETE CASCADE;


--
-- Name: participants participants_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.participants
    ADD CONSTRAINT participants_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: projects projects_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: rating_excerpts rating_excerpts_excerpt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rating_excerpts
    ADD CONSTRAINT rating_excerpts_excerpt_id_fkey FOREIGN KEY (excerpt_id) REFERENCES public.excerpts(id) ON DELETE CASCADE;


--
-- Name: rating_excerpts rating_excerpts_rating_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rating_excerpts
    ADD CONSTRAINT rating_excerpts_rating_id_fkey FOREIGN KEY (rating_id) REFERENCES public.outcome_ratings(id) ON DELETE CASCADE;


--
-- Name: segments segments_participant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.segments
    ADD CONSTRAINT segments_participant_id_fkey FOREIGN KEY (participant_id) REFERENCES public.participants(id);


--
-- Name: segments segments_transcript_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.segments
    ADD CONSTRAINT segments_transcript_id_fkey FOREIGN KEY (transcript_id) REFERENCES public.transcripts(id) ON DELETE CASCADE;


--
-- Name: tags tags_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: transcripts transcripts_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transcripts
    ADD CONSTRAINT transcripts_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: transcripts transcripts_replaces_transcript_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transcripts
    ADD CONSTRAINT transcripts_replaces_transcript_id_fkey FOREIGN KEY (replaces_transcript_id) REFERENCES public.transcripts(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict dbmate


--
-- Dbmate schema migrations
--

INSERT INTO public.schema_migrations (version) VALUES
    ('20261030094000'),
    ('20261030094328'),
    ('20261102075926'),
    ('20261102093301'),
    ('20261102095531'),
    ('20261102111045'),
    ('20261102111815'),
    ('20261102112327'),
    ('20261102113141'),
    ('20261102144517'),
    ('20261102150501'),
    ('20261102160000'),
    ('20261102160100'),
    ('20261102160200');
