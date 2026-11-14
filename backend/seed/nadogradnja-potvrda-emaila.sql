-- Jednokratna nadogradnja baze napravljene pre potvrde emaila: postojeci nalozi postaju aktivirani.
-- Pokretanje (iz foldera backend, pre prvog pokretanja nove verzije backend-a):
--   docker cp seed/nadogradnja-potvrda-emaila.sql zgrada_container:/tmp/nadogradnja.sql
--   docker exec zgrada_container sh -c 'psql -q -U $POSTGRES_USER -d $POSTGRES_DB -f /tmp/nadogradnja.sql'
-- Skripta radi samo dok postoji stara tabela token_lozinke, pa ponovno pokretanje ne menja nista.

BEGIN;

DO $$
BEGIN
  IF to_regclass('token_lozinke') IS NOT NULL THEN
    ALTER TABLE korisnik ADD COLUMN IF NOT EXISTS "emailPotvrdjen" timestamptz;
    UPDATE korisnik SET "emailPotvrdjen" = "kreiranDatum" WHERE "emailPotvrdjen" IS NULL;
    TRUNCATE neuspela_prijava;
    DROP TABLE token_lozinke;
  END IF;
END $$;

COMMIT;
