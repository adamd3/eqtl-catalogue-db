--
-- PostgreSQL database dump
--

\restrict qODJRvDQwUO1ayMnhGr305PYcD0UvcRoNPdS3EnRa6wlOdXxDi6Ob2DsgilWd6f

-- Dumped from database version 13.22 (Debian 13.22-1.pgdg13+1)
-- Dumped by pg_dump version 13.22 (Debian 13.22-1.pgdg13+1)

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
-- Name: association; Type: TABLE; Schema: public; Owner: eqtl_user
--

CREATE TABLE public.association (
    id integer NOT NULL,
    variant_id character varying(200),
    gene_id character varying(30),
    pvalue double precision,
    beta double precision,
    se double precision,
    r2 double precision
);


ALTER TABLE public.association OWNER TO eqtl_user;

--
-- Name: gene; Type: TABLE; Schema: public; Owner: eqtl_user
--

CREATE TABLE public.gene (
    gene_id character varying(30) NOT NULL,
    median_tpm double precision,
    gene_name character varying(30)
);


ALTER TABLE public.gene OWNER TO eqtl_user;

--
-- Name: variant; Type: TABLE; Schema: public; Owner: eqtl_user
--

CREATE TABLE public.variant (
    variant_id character varying(200) NOT NULL,
    rsid character varying(200),
    chromosome character varying(5),
    "position" integer,
    ref character varying(200),
    alt character varying(200),
    ma_samples integer,
    maf double precision,
    type character varying(20),
    ac integer,
    an integer
);


ALTER TABLE public.variant OWNER TO eqtl_user;

--
-- Name: exon; Type: TABLE; Schema: public; Owner: eqtl_user
--

CREATE TABLE public.exon (
    id SERIAL NOT NULL,
    gene_id character varying(30),
    chromosome character varying(2),
    start_position integer,
    end_position integer,
    strand character varying(1)
);


ALTER TABLE public.exon OWNER TO eqtl_user;

--
-- Name: exon exon_pkey; Type: CONSTRAINT; Schema: public; Owner: eqtl_user
--

ALTER TABLE ONLY public.exon
    ADD CONSTRAINT exon_pkey PRIMARY KEY (id);

--
-- Name: idx_exon_gene_id; Type: INDEX; Schema: public; Owner: eqtl_user
--

CREATE INDEX idx_exon_gene_id ON public.exon USING btree (gene_id);

--
-- Name: exon exon_gene_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: eqtl_user
--

ALTER TABLE ONLY public.exon
    ADD CONSTRAINT exon_gene_id_fkey FOREIGN KEY (gene_id) REFERENCES public.gene(gene_id);


--
-- Name: association association_pkey; Type: CONSTRAINT; Schema: public; Owner: eqtl_user
--

ALTER TABLE ONLY public.association
    ADD CONSTRAINT association_pkey PRIMARY KEY (id);


--
-- Name: gene gene_pkey; Type: CONSTRAINT; Schema: public; Owner: eqtl_user
--

ALTER TABLE ONLY public.gene
    ADD CONSTRAINT gene_pkey PRIMARY KEY (gene_id);


--
-- Name: variant variant_pkey; Type: CONSTRAINT; Schema: public; Owner: eqtl_user
--

ALTER TABLE ONLY public.variant
    ADD CONSTRAINT variant_pkey PRIMARY KEY (variant_id);


--
-- Name: idx_association_gene; Type: INDEX; Schema: public; Owner: eqtl_user
--

CREATE INDEX idx_association_gene ON public.association USING btree (gene_id);


--
-- Name: idx_association_pvalue; Type: INDEX; Schema: public; Owner: eqtl_user
--

CREATE INDEX idx_association_pvalue ON public.association USING btree (pvalue);


--
-- Name: idx_association_variant; Type: INDEX; Schema: public; Owner: eqtl_user
--

CREATE INDEX idx_association_variant ON public.association USING btree (variant_id);


--
-- Name: idx_variant_rsid; Type: INDEX; Schema: public; Owner: eqtl_user
--

CREATE INDEX idx_variant_rsid ON public.variant USING btree (rsid);


--
-- Name: association association_gene_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: eqtl_user
--

ALTER TABLE ONLY public.association
    ADD CONSTRAINT association_gene_id_fkey FOREIGN KEY (gene_id) REFERENCES public.gene(gene_id);


--
-- Name: association association_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: eqtl_user
--

ALTER TABLE ONLY public.association
    ADD CONSTRAINT association_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.variant(variant_id);


--
-- PostgreSQL database dump complete
--

\unrestrict qODJRvDQwUO1ayMnhGr305PYcD0UvcRoNPdS3EnRa6wlOdXxDi6Ob2DsgilWd6f

