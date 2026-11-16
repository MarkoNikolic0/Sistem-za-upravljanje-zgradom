-- Jednokratna nadogradnja baze napravljene dok je upravnik mogao da vodi samo jednu zgradu:
-- veza se prenosi sa korisnika (korisnik."zgradaId") na zgradu (zgrada."upravnikId").
-- Pokretanje (iz foldera backend, pre prvog pokretanja nove verzije backend-a):
--   docker cp seed/nadogradnja-upravnik-vise-zgrada.sql zgrada_container:/tmp/nadogradnja.sql
--   docker exec zgrada_container sh -c 'psql -q -U $POSTGRES_USER -d $POSTGRES_DB -f /tmp/nadogradnja.sql'
-- Skripta radi samo dok postoji stara kolona korisnik."zgradaId", pa ponovno pokretanje ne menja nista.

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'korisnik' AND column_name = 'zgradaId'
  ) THEN
    ALTER TABLE zgrada ADD COLUMN IF NOT EXISTS "upravnikId" integer;
    UPDATE zgrada z SET "upravnikId" = k.id
    FROM korisnik k
    WHERE k."zgradaId" = z.id AND k.uloga = 'upravnik';
    ALTER TABLE korisnik DROP COLUMN "zgradaId";
  END IF;
END $$;

COMMIT;
